import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { clientOrderDecisionSchema } from "@/modules/orders/schemas";
import { clientRespondToRevision, OrderDomainError } from "@/modules/orders/order-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params;
    const body = await request.json();
    const parsed = clientOrderDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Requête de validation invalide." }, { status: 400 });
    }

    const sessionUser = await getVerifiedSessionUser();
    const updated = await clientRespondToRevision({
      orderNumber,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
      guestToken: parsed.data.guestToken ?? null,
      sessionUser,
    });

    return NextResponse.json({
      ok: true,
      orderNumber: updated.orderNumber,
      status: updated.status,
      totalClientXof: updated.totalClientXof,
    });
  } catch (error) {
    if (error instanceof OrderDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Erreur lors de la validation de votre décision." },
      { status: 500 }
    );
  }
}
