import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { getCompanyProfile } from "@/modules/payments/settings";
import { generateDeliverySlipPdfBytes } from "@/modules/invoices/delivery-slip-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiPermission("orders:manage:all");
    const { id } = await context.params;

    const [company, order] = await Promise.all([
      getCompanyProfile(),
      prisma.order.findUnique({
        where: { id },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          delivery: true,
        },
      }),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const addr = (order.deliveryAddressSnapshot ?? {}) as Record<
      string,
      string | null | undefined
    >;

    const pdfBytes = await generateDeliverySlipPdfBytes({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      deliverySlot: order.deliverySlot,
      requiresColdChain: order.delivery?.requiresColdChain ?? false,
      hasFragileItems: order.delivery?.hasFragileItems ?? false,
      driverName: order.delivery?.externalDriverName,
      driverPhone: order.delivery?.externalDriverPhone,
      company,
      client: {
        restaurantName: addr.restaurantName ?? undefined,
        contactName: addr.contactName ?? undefined,
        phone: addr.phone ?? undefined,
        street: addr.street ?? undefined,
        neighborhood: addr.neighborhood ?? undefined,
        landmark: addr.landmark ?? undefined,
        mapsUrl: addr.mapsUrl ?? undefined,
      },
      notes: order.notes,
      items: order.items
        .filter((i) => (i.confirmedQty ?? i.requestedQty) > 0)
        .map((i) => ({
          productName: i.productNameSnapshot,
          unitLabel: i.unitLabelSnapshot,
          quantity: i.confirmedQty ?? i.requestedQty,
          isFragile: i.isFragileSnapshot,
          storageType: i.storageTypeSnapshot,
        })),
    });

    const safeFile = `BL-${order.orderNumber.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFile}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible de générer le bon de livraison PDF." },
      { status: 500 }
    );
  }
}
