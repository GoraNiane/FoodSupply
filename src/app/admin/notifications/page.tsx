import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
import { AdminNotificationsClient } from "@/components/admin/admin-notifications-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications Administration",
};

export default async function AdminNotificationsPage() {
  const adminUser = await requirePageRole(["ADMIN"], "/connexion-admin");

  const notifications = await prisma.notification.findMany({
    where: { userId: adminUser.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Alertes en temps réel sur les paiements Wave signalés, commandes et propositions.
        </p>
      </div>

      <AdminNotificationsClient
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          linkUrl: n.linkUrl,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
