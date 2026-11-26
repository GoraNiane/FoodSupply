import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/permissions/rbac";
import { generateInvoicePdfBytes } from "@/modules/invoices/pdf-generator";
import { getCompanyProfile } from "@/modules/payments/settings";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params;
    const url = new URL(request.url);
    const guestToken = url.searchParams.get("token");
    const actor = await getVerifiedSessionUser();

    const [company, order] = await Promise.all([
      getCompanyProfile(),
      prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          delivery: true,
        },
      }),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const allowed = canAccessOrder({
      order: {
        restaurantId: order.restaurantId,
        isGuestOrder: order.isGuestOrder,
        guestTrackingTokenHash: order.guestTrackingTokenHash,
        assignedDriverId: order.delivery?.driverId ?? null,
      },
      actor,
      guestToken,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé à ce devis proforma." }, { status: 403 });
    }

    const clientAddr = (order.deliveryAddressSnapshot ?? {}) as Record<
      string,
      string | null | undefined
    >;

    const items = order.items
      .filter((i) => (i.confirmedQty ?? i.requestedQty) > 0)
      .map((i) => ({
        productName: i.productNameSnapshot,
        unitLabel: i.unitLabelSnapshot,
        quantity: i.confirmedQty ?? i.requestedQty,
        unitPriceXof: i.clientUnitPriceXof,
        lineTotalXof: i.lineClientTotalXof,
      }));

    const proformaRef = `PRO-${order.orderNumber}`;
    const pdfBytes = await generateInvoicePdfBytes({
      documentType: "PROFORMA",
      invoiceNumber: proformaRef,
      orderNumber: order.orderNumber,
      issuedAt: new Date(),
      paymentStatus: "UNPAID",
      paymentMethod: "Wave Sénégal / Orange Money / Livraison",
      currency: order.currency,
      subtotalClientXof: order.subtotalClientXof,
      deliveryFeeXof: order.deliveryFeeXof,
      totalClientXof: order.totalClientXof,
      company,
      client: {
        restaurantName: clientAddr.restaurantName ?? undefined,
        contactName: clientAddr.contactName ?? undefined,
        phone: clientAddr.phone ?? undefined,
        email: clientAddr.email ?? undefined,
        street: clientAddr.street ?? undefined,
        neighborhood: clientAddr.neighborhood ?? undefined,
        landmark: clientAddr.landmark ?? undefined,
      },
      items,
    });

    const safeFileName = proformaRef.replace(/[^A-Za-z0-9_-]/g, "");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la génération du devis proforma PDF." },
      { status: 500 }
    );
  }
}
