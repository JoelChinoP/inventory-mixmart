import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import type {
  UserCreateInput,
  UserUpdateInput,
} from "@/services/form-schemas";
import type { UserRole } from "../../prisma/generated/client";

export class SelfDeactivationError extends Error {
  constructor() {
    super("Users cannot deactivate their own account.");
    this.name = "SelfDeactivationError";
  }
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
