import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/permissions/rbac";
import { Card, buttonVariants } from "@/components/ui";
import {
  OrderTrackingClient,
  type TrackedOrderView,
} from "@/components/orders/order-tracking-client";
import { getPaymentConfig } from "@/modules/payments/settings";
import { buildWavePaymentUrl } from "@/modules/payments/wave";
import { getRestaurantUsedCreditXof } from "@/modules/payments/payment-service";
import { normalizeVolumeTiers } from "@/modules/catalog/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suivi de commande",
};

export default async function TrackOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const guestToken = typeof sp.token === "string" ? sp.token : null;

  const [sessionUser, paymentConfig, order] = await Promise.all([
    getVerifiedSessionUser(),
    getPaymentConfig(),
    prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            product: {
              select: {
                slug: true,
                imageUrl: true,
                storageType: true,
                isFragile: true,
                isActive: true,
                volumeTiers: true,
                category: { select: { name: true } },
              },
            },
            supplierOffer: {
              select: {
                id: true,
                isActive: true,
                availability: true,
                minOrderQty: true,
              },
            },
          },
        },
        delivery: true,
        invoice: true,
        payments: { orderBy: { createdAt: "desc" }, take: 5 },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-navy-900">Commande introuvable</h1>
          <p className="mt-2 text-sm text-slate-600">
            Vérifiez le numéro de commande saisi ou retournez à la recherche.
          </p>
          <div className="mt-6">
            <Link href="/suivi" className={buttonVariants({ variant: "primary" })}>
              Retour au suivi
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const allowed = canAccessOrder({
    order: {
      restaurantId: order.restaurantId,
      isGuestOrder: order.isGuestOrder,
      guestTrackingTokenHash: order.guestTrackingTokenHash,
      assignedDriverId: order.delivery?.driverId ?? null,
    },
    actor: sessionUser,
    guestToken,
  });

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-navy-900">Lien de suivi protégé</h1>
          <p className="mt-2 text-sm text-slate-600">
            Pour protéger la confidentialité des commandes, utilisez votre lien complet contenant le
            jeton de sécurité ou connectez-vous au compte propriétaire.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/suivi" className={buttonVariants({ variant: "outline" })}>
              Saisir mon jeton
            </Link>
            <Link href="/connexion" className={buttonVariants({ variant: "primary" })}>
              Se connecter
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Vérification ligne Crédit Pro B2B si client connecté
  let creditPro: TrackedOrderView["creditPro"] = null;
  if (sessionUser?.restaurantId && order.restaurantId === sessionUser.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: sessionUser.restaurantId },
      select: { creditEnabled: true, creditLimitXof: true, creditTermDays: true },
    });
    if (restaurant?.creditEnabled && restaurant.creditLimitXof > 0) {
      const usedXof = await getRestaurantUsedCreditXof(sessionUser.restaurantId);
      creditPro = {
        limitXof: restaurant.creditLimitXof,
        usedXof,
        remainingXof: Math.max(0, restaurant.creditLimitXof - usedXof),
        termDays: restaurant.creditTermDays,
      };
    }
  }

  const addr = (order.deliveryAddressSnapshot ?? {}) as TrackedOrderView["address"];
  const wavePaymentUrl =
    order.totalClientXof > 0
      ? buildWavePaymentUrl(order.totalClientXof, paymentConfig.waveMerchantBaseUrl)
      : null;

  const latestPayment = order.payments[0] ?? null;
  const latestMeta = (latestPayment?.metadata ?? {}) as {
    clientDeclaredPaid?: boolean;
    clientDeclarationRef?: string | null;
  };

  const reorderItems = order.items
    .filter(
      (i) =>
        i.product.isActive &&
        i.supplierOffer.isActive &&
        i.supplierOffer.availability !== "OUT_OF_STOCK"
    )
    .map((i) => ({
      offerId: i.supplierOffer.id,
      slug: i.product.slug,
      name: i.productNameSnapshot,
      unitLabel: i.unitLabelSnapshot,
      categoryName: i.product.category.name,
      clientUnitPriceXof: i.clientUnitPriceXof,
      minOrderQty: i.supplierOffer.minOrderQty,
      quantity: Math.max(i.supplierOffer.minOrderQty, i.confirmedQty ?? i.requestedQty),
      storageType: i.product.storageType,
      isFragile: i.product.isFragile,
      imageUrl: i.product.imageUrl,
      volumeTiers: normalizeVolumeTiers(i.product.volumeTiers),
    }));

  const view: TrackedOrderView = {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    subtotalClientXof: order.subtotalClientXof,
    deliveryFeeXof: order.deliveryFeeXof,
    totalClientXof: order.totalClientXof,
    requiresClientApproval: order.requiresClientApproval,
    isCreditOrder: order.isCreditOrder,
    paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
    notes: order.notes,
    wavePaymentUrl,
    allowCashOnDelivery: paymentConfig.allowCashOnDelivery,
    allowOrangeMoney: paymentConfig.allowOrangeMoney,
    orangeMoneyMerchantCode: paymentConfig.orangeMoneyMerchantCode,
    creditPro,
    reorderItems,
    latestPayment: latestPayment
      ? {
          id: latestPayment.id,
          reference: latestPayment.reference,
          method: latestPayment.method,
          status: latestPayment.status,
          amountXof: latestPayment.amountXof,
          paidAt: latestPayment.paidAt?.toISOString() ?? null,
          clientDeclaredPaid: Boolean(latestMeta.clientDeclaredPaid),
          clientDeclarationRef: latestMeta.clientDeclarationRef ?? null,
        }
      : null,
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          invoiceNumber: order.invoice.invoiceNumber,
          paymentStatus: order.invoice.paymentStatus,
          issuedAt: order.invoice.issuedAt.toISOString(),
        }
      : null,
    address: addr,
    delivery: order.delivery
      ? {
          externalDriverName: order.delivery.externalDriverName,
          externalDriverPhone: order.delivery.externalDriverPhone,
          requiresColdChain: order.delivery.requiresColdChain,
          hasFragileItems: order.delivery.hasFragileItems,
          deliveredAt: order.delivery.deliveredAt?.toISOString() ?? null,
        }
      : null,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productNameSnapshot,
      unitLabel: i.unitLabelSnapshot,
      requestedQty: i.requestedQty,
      confirmedQty: i.confirmedQty,
      clientUnitPriceXof: i.clientUnitPriceXof,
      lineClientTotalXof: i.lineClientTotalXof,
      itemStatus: i.itemStatus,
    })),
    history: order.statusHistory.map((h) => ({
      id: h.id,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <OrderTrackingClient order={view} guestToken={guestToken} />
    </div>
  );
}
