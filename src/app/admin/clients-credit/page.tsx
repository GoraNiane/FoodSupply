import type { Metadata } from "next";
import { AlertTriangle, Briefcase, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { StatCard } from "@/components/ui";
import { formatXof } from "@/lib/utils/format";
import { getPaymentConfig } from "@/modules/payments/settings";
import { buildWavePaymentUrl } from "@/modules/payments/wave";
import {
  AdminCreditManager,
  type CreditRestaurantRow,
  type UnpaidCreditOrderRow,
} from "@/components/admin/admin-credit-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crédit Pro B2B & Encours",
};

export default async function AdminCreditAccountsPage() {
  const [paymentConfig, restaurants, unpaidCreditOrders] = await Promise.all([
    getPaymentConfig(),
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        isCreditOrder: true,
        status: { notIn: ["ANNULEE", "REMBOURSEE"] },
        OR: [{ invoice: { is: null } }, { invoice: { paymentStatus: "UNPAID" } }],
      },
      orderBy: { paymentDueAt: "asc" },
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
    }),
  ]);

  const usedByRestaurant = new Map<string, number>();
  for (const ord of unpaidCreditOrders) {
    if (ord.restaurantId) {
      usedByRestaurant.set(
        ord.restaurantId,
        (usedByRestaurant.get(ord.restaurantId) ?? 0) + ord.totalClientXof
      );
    }
  }

  const now = Date.now();
  const totalOutstandingXof = unpaidCreditOrders.reduce((s, o) => s + o.totalClientXof, 0);
  const overdueOrders = unpaidCreditOrders.filter(
    (o) => o.paymentDueAt && o.paymentDueAt.getTime() < now
  );
  const activeCreditAccounts = restaurants.filter((r) => r.creditEnabled && r.creditLimitXof > 0).length;

  const restaurantRows: CreditRestaurantRow[] = restaurants.map((r) => ({
    id: r.id,
    businessName: r.businessName,
    contactPhone: r.contactPhone,
    ownerName: r.user.fullName,
    ownerEmail: r.user.email,
    creditEnabled: r.creditEnabled,
    creditLimitXof: r.creditLimitXof,
    creditTermDays: r.creditTermDays,
    usedCreditXof: usedByRestaurant.get(r.id) ?? 0,
  }));

  const unpaidRows: UnpaidCreditOrderRow[] = unpaidCreditOrders.map((o) => {
    const addr = (o.deliveryAddressSnapshot ?? {}) as {
      restaurantName?: string;
      contactName?: string;
      phone?: string;
    };
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: addr.restaurantName || addr.contactName || "Client Pro",
      clientPhone: addr.phone ?? o.guestPhone ?? null,
      totalClientXof: o.totalClientXof,
      paymentDueAt: o.paymentDueAt?.toISOString() ?? null,
      isOverdue: Boolean(o.paymentDueAt && o.paymentDueAt.getTime() < now),
      wavePaymentUrl:
        o.totalClientXof > 0
          ? buildWavePaymentUrl(o.totalClientXof, paymentConfig.waveMerchantBaseUrl)
          : null,
      invoiceNumber: o.invoice?.invoiceNumber ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Crédit Pro B2B (J+7 / J+15) & Encours</h1>
        <p className="mt-1 text-sm text-slate-600">
          Accordez une ligne de crédit encadrée à vos hôtels, traiteurs et restaurants fidèles,
          suivez les échéances et relancez par WhatsApp avec lien Wave pré-rempli.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Encours total à encaisser"
          value={formatXof(totalOutstandingXof)}
          subtitle={`${unpaidCreditOrders.length} facture(s) crédit en cours`}
          icon={<CreditCard className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          title="Factures échues (retard)"
          value={overdueOrders.length}
          subtitle="À relancer par WhatsApp"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={overdueOrders.length > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Comptes Crédit Pro actifs"
          value={activeCreditAccounts}
          subtitle={`Sur ${restaurants.length} compte(s) inscrit(s)`}
          icon={<Briefcase className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <AdminCreditManager restaurants={restaurantRows} unpaidCreditOrders={unpaidRows} />
    </div>
  );
}
