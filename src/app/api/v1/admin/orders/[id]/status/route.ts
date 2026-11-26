import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminStatusTransitionSchema } from "@/modules/orders/schemas";
import { adminTransitionOrderStatus, OrderDomainError } from "@/modules/orders/order-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireApiPermission("orders:manage:all");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = adminStatusTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
    }

    const updated = await adminTransitionOrderStatus({
      orderId: id,
      input: parsed.data,
      adminUser,
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof OrderDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error && error.message.startsWith("Transition de statut interdite")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Impossible de mettre à jour le statut de la commande." },
      { status: 500 }
    );
  }
}
