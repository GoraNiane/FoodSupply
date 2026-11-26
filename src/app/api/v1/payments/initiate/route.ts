import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";
import { initiatePaymentSchema } from "@/modules/payments/schemas";
import {
  initiateOrDeclareOrderPayment,
  PaymentDomainError,
} from "@/modules/payments/payment-service";

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const limit = checkRateLimit({
      key: `payments:initiate:${ip}`,
      limit: 25,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = initiatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données de paiement invalides." },
        { status: 400 }
      );
    }

    const actor = await getVerifiedSessionUser();
    const result = await initiateOrDeclareOrderPayment({
      input: parsed.data,
      actor,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre paiement pour le moment." },
      { status: 500 }
    );
  }
}
