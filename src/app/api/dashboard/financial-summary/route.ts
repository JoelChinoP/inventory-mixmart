import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDashboardFinancialSummary } from "@/services/dashboard.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      isActive: true,
      deletedAt: null,
    },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const summary = await getDashboardFinancialSummary(
    searchParams.get("range") ?? undefined,
  );

  return Response.json(summary);
}
