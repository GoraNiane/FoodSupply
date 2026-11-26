import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";
import { submitOrderSchema } from "@/modules/orders/schemas";
import { createOrderFromSubmission, OrderDomainError } from "@/modules/orders/order-service";

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `order:create:${ip}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Trop de commandes soumises en peu de temps. Veuillez patienter quelques minutes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = submitOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Veuillez vérifier les informations de livraison et votre panier.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const sessionUser = await getVerifiedSessionUser();
    const result = await createOrderFromSubmission({
      input: parsed.data,
      sessionUser,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[orders/POST] Erreur :", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre commande pour le moment." },
      { status: 500 }
    );
  }
}
