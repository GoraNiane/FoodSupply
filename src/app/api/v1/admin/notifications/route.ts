import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const markReadSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireApiPermission("orders:manage:all");
    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const now = new Date();
    if (parsed.data.markAll) {
      await prisma.notification.updateMany({
        where: { userId: adminUser.id, isRead: false },
        data: { isRead: true, readAt: now },
      });
    } else if (parsed.data.id) {
      await prisma.notification.updateMany({
        where: { id: parsed.data.id, userId: adminUser.id },
        data: { isRead: true, readAt: now },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de mettre à jour les notifications." },
      { status: 500 }
    );
  }
}
