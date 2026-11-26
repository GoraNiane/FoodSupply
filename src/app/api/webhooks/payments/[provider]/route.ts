import { NextResponse } from "next/server";
import {
  PaymentDomainError,
  processPaymentWebhook,
} from "@/modules/payments/payment-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params;
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("x-foodsupply-signature") ??
      request.headers.get("wave-signature") ??
      request.headers.get("x-webhook-signature");

    const result = await processPaymentWebhook({
      provider,
      rawBody,
      signatureHeader,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur de traitement webhook." }, { status: 500 });
  }
}
