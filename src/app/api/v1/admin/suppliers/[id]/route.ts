import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const updateSupplierStatusSchema = z.object({
  verificationStatus: z.nativeEnum(VerificationStatus),
  isActive: z.boolean().optional(),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireApiPermission("suppliers:verify");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateSupplierStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    }

    const isSuspended = parsed.data.verificationStatus === VerificationStatus.SUSPENDED;
    const isActive = parsed.data.isActive ?? !isSuspended;

    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: {
          verificationStatus: parsed.data.verificationStatus,
          isActive,
          verifiedById: admin.id,
          verifiedAt:
            parsed.data.verificationStatus === VerificationStatus.APPROVED ? new Date() : existing.verifiedAt,
          rejectionReason: parsed.data.rejectionReason ?? null,
        },
      });

      if (isSuspended) {
        // Retire automatiquement les offres liées à un fournisseur suspendu
        await tx.supplierOffer.updateMany({
          where: { supplierId: id },
          data: { isActive: false },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_SUPPLIER_STATUS_UPDATED",
          entityType: "Supplier",
          entityId: id,
          beforeJson: { verificationStatus: existing.verificationStatus, isActive: existing.isActive },
          afterJson: { verificationStatus: parsed.data.verificationStatus, isActive },
        },
      });
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la mise à jour du fournisseur." }, { status: 500 });
  }
}
