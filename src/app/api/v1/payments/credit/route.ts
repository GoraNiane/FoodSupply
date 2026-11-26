import { NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import {
  confirmOrderOnCreditPro,
  PaymentDomainError,
} from "@/modules/payments/payment-service";

const creditConfirmSchema = z.object({
  orderNumber: z.string().trim().min(4).max(60),
});

export async function POST(request: Request) {
  try {
    const actor = await getVerifiedSessionUser();
    if (!actor) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = creditConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Numéro de commande invalide." }, { status: 400 });
    }

    const result = await confirmOrderOnCreditPro({
      orderNumber: parsed.data.orderNumber,
      actor,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      dueAt: result.dueAt.toISOString(),
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de valider la commande en Crédit Pro." },
      { status: 500 }
    );
  }
}
