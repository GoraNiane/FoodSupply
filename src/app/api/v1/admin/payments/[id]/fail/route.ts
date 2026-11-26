import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminFailPaymentSchema } from "@/modules/payments/schemas";
import {
  adminMarkPaymentFailed,
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
    const parsed = adminFailPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Motif invalide." },
        { status: 400 }
      );
    }

    const updated = await adminMarkPaymentFailed({
      paymentId: id,
      input: parsed.data,
      adminUser,
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de marquer le paiement comme échoué." },
      { status: 500 }
    );
  }
}
