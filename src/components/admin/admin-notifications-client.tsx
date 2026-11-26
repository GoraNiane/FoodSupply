"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Badge, Button, Card, EmptyState, useToast } from "@/components/ui";
import { formatDateDakar } from "@/lib/utils/format";

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function AdminNotificationsClient({
  notifications,
}: {
  notifications: AdminNotificationItem[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markRead(payload: { id?: string; markAll?: boolean }) {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/v1/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        notify({
          type: "success",
          title: payload.markAll ? "Toutes les notifications marquées comme lues" : "Marquée lue",
        });
        router.refresh();
      }
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isUpdating}
            onClick={() => markRead({ markAll: true })}
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu ({unreadCount})
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Aucune notification"
          description="Les alertes de paiements Wave signalés, commandes clients et propositions fournisseurs apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 transition-colors ${
                n.isRead ? "bg-white" : "border-brand-300 bg-brand-50/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      n.isRead ? "bg-surface-subtle text-slate-500" : "bg-brand-600 text-white"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-navy-900">{n.title}</p>
                      {!n.isRead && <Badge variant="brand">Nouveau</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateDakar(n.createdAt, true)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {n.linkUrl && (
                    <Link
                      href={n.linkUrl}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                    >
                      Ouvrir
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {!n.isRead && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => markRead({ id: n.id })}
                    >
                      Lu
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
