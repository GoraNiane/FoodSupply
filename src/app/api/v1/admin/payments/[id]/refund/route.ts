import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminRefundPaymentSchema } from "@/modules/payments/schemas";
import {
  adminRefundPayment,
  PaymentDomainError,
} from "@/modules/payments/payment-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireApiPermission("payments:manage:all");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = adminRefundPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données de remboursement invalides." },
        { status: 400 }
      );
    }

    const refund = await adminRefundPayment({
      paymentId: id,
      input: parsed.data,
      adminUser,
    });

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      reference: refund.reference,
      amountXof: refund.amountXof,
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'enregistrer le remboursement." },
      { status: 500 }
    );
  }
}
