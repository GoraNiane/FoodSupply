import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import {
  adminSettleCreditOrder,
  PaymentDomainError,
} from "@/modules/payments/payment-service";

const updateCreditSchema = z.object({
  restaurantId: z.string().trim().min(5),
  creditEnabled: z.boolean(),
  creditLimitXof: z.coerce.number().int().min(0).max(100_000_000),
  creditTermDays: z.coerce.number().int().min(1).max(60).default(7),
});

const settleCreditSchema = z.object({
  orderId: z.string().trim().min(5),
  method: z.enum(["WAVE", "ORANGE_MONEY", "BANK_TRANSFER", "CASH_ON_DELIVERY"]).default("WAVE"),
  providerTransactionId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireApiPermission("payments:manage:all");
    const body = await request.json();
    const parsed = updateCreditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Paramètres crédit invalides." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.restaurant.update({
        where: { id: parsed.data.restaurantId },
        data: {
          creditEnabled: parsed.data.creditEnabled,
          creditLimitXof: parsed.data.creditLimitXof,
          creditTermDays: parsed.data.creditTermDays,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminUser.id,
          action: "RESTAURANT_CREDIT_UPDATED",
          entityType: "Restaurant",
          entityId: r.id,
          afterJson: parsed.data,
        },
      });

      return r;
    });

    return NextResponse.json({ ok: true, restaurant: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de mettre à jour le compte crédit." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireApiPermission("payments:manage:all");
    const body = await request.json();
    const parsed = settleCreditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données d'encaissement invalides." },
        { status: 400 }
      );
    }

    const result = await adminSettleCreditOrder({
      orderId: parsed.data.orderId,
      method: parsed.data.method,
      providerTransactionId: parsed.data.providerTransactionId,
      note: parsed.data.note,
      adminUser,
    });

    return NextResponse.json({
      ok: true,
      paymentReference: result.payment.reference,
      invoiceNumber: result.invoice.invoiceNumber,
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'encaisser ce solde crédit." },
      { status: 500 }
    );
  }
}
