import crypto from "crypto";
import { NextResponse } from "next/server";
import { PayoutMethod, SettlementStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const markSettledSchema = z.object({
  supplierOrderId: z.string().trim().min(5),
  payoutMethod: z.nativeEnum(PayoutMethod).default(PayoutMethod.WAVE),
  externalTransferRef: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(400).optional(),
});

export async function POST(request: Request) {
  try {
    const adminUser = await requireApiPermission("settlements:manage");
    const body = await request.json();
    const parsed = markSettledSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données de reversement invalides." }, { status: 400 });
    }

    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id: parsed.data.supplierOrderId },
      include: { settlement: true, supplier: { select: { companyName: true } } },
    });

    if (!supplierOrder) {
      return NextResponse.json({ error: "Sous-commande fournisseur introuvable." }, { status: 404 });
    }
    if (supplierOrder.settlement?.status === SettlementStatus.PAID) {
      return NextResponse.json({ error: "Ce reversement a déjà été marqué payé." }, { status: 409 });
    }

    const year = new Date().getFullYear();
    const ref = `REV-${year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.supplierSettlement.upsert({
        where: { supplierOrderId: supplierOrder.id },
        update: {
          amountXof: supplierOrder.subtotalSupplierXof,
          status: SettlementStatus.PAID,
          payoutMethod: parsed.data.payoutMethod,
          externalTransferRef: parsed.data.externalTransferRef || null,
          paidAt: new Date(),
          paidByAdminId: adminUser.id,
          notes: parsed.data.notes || null,
        },
        create: {
          reference: ref,
          supplierId: supplierOrder.supplierId,
          supplierOrderId: supplierOrder.id,
          amountXof: supplierOrder.subtotalSupplierXof,
          status: SettlementStatus.PAID,
          payoutMethod: parsed.data.payoutMethod,
          externalTransferRef: parsed.data.externalTransferRef || null,
          paidAt: new Date(),
          paidByAdminId: adminUser.id,
          notes: parsed.data.notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminUser.id,
          action: "SUPPLIER_SETTLEMENT_PAID",
          entityType: "SupplierSettlement",
          entityId: s.id,
          afterJson: {
            reference: s.reference,
            supplierName: supplierOrder.supplier.companyName,
            amountXof: s.amountXof,
            payoutMethod: s.payoutMethod,
            externalTransferRef: s.externalTransferRef,
          },
        },
      });

      return s;
    });

    return NextResponse.json({ ok: true, reference: settlement.reference });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'enregistrer ce reversement." },
      { status: 500 }
    );
  }
}
