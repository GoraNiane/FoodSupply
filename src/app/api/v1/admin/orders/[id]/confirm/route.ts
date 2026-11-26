import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminConfirmOrderSchema } from "@/modules/orders/schemas";
import { adminConfirmOrder, OrderDomainError } from "@/modules/orders/order-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireApiPermission("orders:manage:all");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = adminConfirmOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données de confirmation invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await adminConfirmOrder({
      orderId: id,
      input: parsed.data,
      adminUser,
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      totalClientXof: updated.totalClientXof,
      requiresClientApproval: updated.requiresClientApproval,
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof OrderDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Erreur lors de la confirmation de la commande." },
      { status: 500 }
    );
  }
}
