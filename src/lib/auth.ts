import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";

import type { UserRole } from "../../prisma/generated/client";
import prisma from "./prisma";
import { verifyPassword } from "./password";

const DEFAULT_AUTHENTICATED_PATH = "/dashboard";
const SIGN_IN_PATH = "/login";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim();
}

function isSafeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export function getSafeCallbackUrl(value: string | string[] | undefined) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  if (callbackUrl && isSafeRelativePath(callbackUrl)) {
    return callbackUrl;
  }

  return DEFAULT_AUTHENTICATED_PATH;
}

export function getSignInPath(callbackUrl?: string) {
  if (!callbackUrl || callbackUrl === DEFAULT_AUTHENTICATED_PATH) {
    return SIGN_IN_PATH;
  }

  const params = new URLSearchParams({ callbackUrl });
  return `${SIGN_IN_PATH}?${params.toString()}`;
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: SIGN_IN_PATH,
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "Usuario o correo",
      credentials: {
        identifier: {
          label: "Usuario o correo",
          type: "text",
          placeholder: "admin o correo@ejemplo.com",
        },
        password: {
          label: "Contrasena",
          type: "password",
        },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier;
        const password = credentials?.password;

        if (!identifier || !password) {
          return null;
        }

        const normalizedIdentifier = normalizeIdentifier(identifier);
        const normalizedEmail = normalizeEmail(normalizedIdentifier);
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: normalizedIdentifier }, { email: normalizedEmail }],
            isActive: true,
            deletedAt: null,
          },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing-google-client-id",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? "missing-google-client-secret",
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const googleProfile = profile as
        | { email?: string; email_verified?: boolean }
        | undefined;

      if (!googleProfile?.email || googleProfile.email_verified !== true) {
        return false;
      }

      const dbUser = await prisma.user.findFirst({
        where: {
          email: normalizeEmail(googleProfile.email),
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!dbUser) {
        return false;
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      });

      user.id = dbUser.id;
      user.email = dbUser.email;
      user.name = `${dbUser.firstName} ${dbUser.lastName}`;
      user.role = dbUser.role;

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: normalizeEmail(token.email),
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession(callbackUrl = DEFAULT_AUTHENTICATED_PATH) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(getSignInPath(callbackUrl));
  }

  return session as Session & {
    user: NonNullable<Session["user"]> & {
      id: string;
      role: UserRole;
    };
  };
}

export async function requireActiveUser(callbackUrl = DEFAULT_AUTHENTICATED_PATH) {
  const session = await requireSession(callbackUrl);
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!user) {
    redirect(getSignInPath(callbackUrl));
  }

  return user;
}

export async function requireRole(
  allowedRoles: UserRole[],
  callbackUrl = DEFAULT_AUTHENTICATED_PATH,
) {
  const user = await requireActiveUser(callbackUrl);

  if (!allowedRoles.includes(user.role)) {
    redirect(DEFAULT_AUTHENTICATED_PATH);
  }

  return user;
}
