import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashPassword } from "@/lib/password";
import prisma, { prismaRaw } from "@/lib/prisma";
import type {
  OwnProfileUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from "@/services/form-schemas";
import type { UserRole } from "../../prisma/generated/client";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const RECOMMENDED_AVATAR_BYTES = 2 * 1024 * 1024;

const avatarMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AvatarUploadErrorCode = "size" | "type";

export class SelfDeactivationError extends Error {
  constructor() {
    super("Users cannot deactivate their own account.");
    this.name = "SelfDeactivationError";
  }
}

export class AvatarUploadError extends Error {
  code: AvatarUploadErrorCode;

  constructor(code: AvatarUploadErrorCode) {
    super(code === "size" ? "Avatar image is too large." : "Invalid avatar image.");
    this.name = "AvatarUploadError";
    this.code = code;
  }
}

function getAvatarExtension(file: File) {
  return avatarMimeTypes[file.type as keyof typeof avatarMimeTypes];
}

function getLocalAvatarPath(avatarUrl: string) {
  if (!avatarUrl.startsWith("/uploads/avatars/")) {
    return null;
  }

  return path.join(process.cwd(), "public", ...avatarUrl.split("/").filter(Boolean));
}

async function deleteLocalAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return;
  }

  const avatarPath = getLocalAvatarPath(avatarUrl);

  if (!avatarPath) {
    return;
  }

  await unlink(avatarPath).catch(() => undefined);
}

export async function saveProfileAvatar({
  userId,
  file,
  previousAvatarUrl,
}: {
  userId: string;
  file: File;
  previousAvatarUrl: string | null;
}) {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError("size");
  }

  const extension = getAvatarExtension(file);

  if (!extension) {
    throw new AvatarUploadError("type");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const fileName = `${userId}-${Date.now()}-${randomUUID()}.${extension}`;
  const publicPath = `/uploads/avatars/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  await deleteLocalAvatar(previousAvatarUrl);

  return publicPath;
}

export async function createUserAccount(data: UserCreateInput) {
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email?.toLowerCase() ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dni: data.dni,
      role: data.role as UserRole,
      passwordHash: await hashPassword(data.password),
      isActive: true,
    },
  });
}

export async function updateUserAccount(data: UserUpdateInput) {
  const password = data.password?.trim();

  return prisma.user.update({
    where: { id: data.id },
    data: {
      username: data.username,
      email: data.email?.toLowerCase() ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dni: data.dni,
      role: data.role as UserRole,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
}

export async function hasProfileIdentityConflict({
  id,
  email,
  dni,
}: {
  id: string;
  email: string | null;
  dni: string | null;
}) {
  const checks = [
    ...(email ? [{ email: email.toLowerCase() }] : []),
    ...(dni ? [{ dni }] : []),
  ];

  if (!checks.length) {
    return false;
  }

  const conflict = await prismaRaw.user.findFirst({
    where: {
      id: { not: id },
      OR: checks,
    },
    select: { id: true },
  });

  return Boolean(conflict);
}

export async function updateOwnProfile({
  id,
  data,
  avatarUrl,
  removeAvatar,
}: {
  id: string;
  data: OwnProfileUpdateInput;
  avatarUrl?: string;
  removeAvatar?: boolean;
}) {
  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { avatarUrl: true },
  });

  if (removeAvatar) {
    await deleteLocalAvatar(currentUser.avatarUrl);
  }

  return prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email?.toLowerCase() ?? null,
      phone: data.phone,
      dni: data.dni,
      ...(avatarUrl !== undefined
        ? { avatarUrl }
        : removeAvatar
          ? { avatarUrl: null }
          : {}),
    },
  });
}

export async function setUserActiveStatus({
  actorId,
  id,
  isActive,
}: {
  actorId: string;
  id: string;
  isActive: boolean;
}) {
  if (actorId === id && !isActive) {
    throw new SelfDeactivationError();
  }

  return prisma.user.update({
    where: { id },
    data: {
      isActive,
      deletedAt: null,
    },
  });
}
