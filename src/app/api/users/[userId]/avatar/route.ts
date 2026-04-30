import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response(null, { status: 401 });
  }

  const { userId } = await params;
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      avatarData: true,
      avatarMimeType: true,
      avatarUpdatedAt: true,
    },
  });

  if (!user?.avatarData || !user.avatarMimeType) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(user.avatarData), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": user.avatarMimeType,
      ETag: `"avatar-${user.avatarUpdatedAt?.getTime() ?? 0}"`,
    },
  });
}
