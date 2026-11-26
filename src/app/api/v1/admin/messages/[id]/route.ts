import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const updateMessageSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED"]),
  adminNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("orders:manage:all");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.adminNote !== undefined ? { adminNote: parsed.data.adminNote } : {}),
      },
    });

    return NextResponse.json({ ok: true, message: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de mettre à jour ce message." },
      { status: 500 }
    );
  }
}
