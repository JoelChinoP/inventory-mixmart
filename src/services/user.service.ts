import { hashPassword } from "@/lib/password";
import prisma, { prismaRaw } from "@/lib/prisma";
import type {
  OwnProfileUpdateInput,
  UserCreateInput,
  UserUpdateInput,
} from "@/services/form-schemas";
import type { UserRole } from "../../prisma/generated/client";

export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
export const RECOMMENDED_AVATAR_BYTES = 2 * 1024 * 1024;

const avatarMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AvatarUploadErrorCode = "size" | "type";
type ProfileAvatarUpload = {
  data: Uint8Array<ArrayBuffer>;
  mimeType: keyof typeof avatarMimeTypes;
  updatedAt: Date;
  url: string;
};

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

function getAvatarUrl(userId: string, updatedAt: Date) {
  return `/api/users/${userId}/avatar?v=${updatedAt.getTime()}`;
}

export async function readProfileAvatarUpload({
  userId,
  file,
}: {
  userId: string;
  file: File;
}): Promise<ProfileAvatarUpload> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError("size");
  }

  const mimeType = file.type as keyof typeof avatarMimeTypes;
  const extension = getAvatarExtension(file);

  if (!extension) {
    throw new AvatarUploadError("type");
  }

  const updatedAt = new Date();

  return {
    data: new Uint8Array(await file.arrayBuffer()),
    mimeType,
    updatedAt,
    url: getAvatarUrl(userId, updatedAt),
  };
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
  avatar,
  removeAvatar,
}: {
  id: string;
  data: OwnProfileUpdateInput;
  avatar?: ProfileAvatarUpload;
  removeAvatar?: boolean;
}) {
  return prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email?.toLowerCase() ?? null,
      phone: data.phone,
      dni: data.dni,
      ...(avatar
        ? {
            avatarData: avatar.data,
            avatarMimeType: avatar.mimeType,
            avatarUpdatedAt: avatar.updatedAt,
            avatarUrl: avatar.url,
          }
        : removeAvatar
          ? {
              avatarData: null,
              avatarMimeType: null,
              avatarUpdatedAt: null,
              avatarUrl: null,
            }
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
