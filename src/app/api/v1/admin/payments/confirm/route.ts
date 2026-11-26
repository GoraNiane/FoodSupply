import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminConfirmPaymentSchema } from "@/modules/payments/schemas";
import {
  adminConfirmOrderPayment,
  PaymentDomainError,
} from "@/modules/payments/payment-service";

export async function POST(request: Request) {
  try {
    const adminUser = await requireApiPermission("payments:manage:all");
    const body = await request.json();
    const parsed = adminConfirmPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Paramètres de confirmation invalides." },
        { status: 400 }
      );
    }

    const result = await adminConfirmOrderPayment({
      input: parsed.data,
      adminUser,
    });

    return NextResponse.json({
      ok: true,
      paymentId: result.payment.id,
      paymentReference: result.payment.reference,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de confirmer le paiement." },
      { status: 500 }
    );
  }
}
