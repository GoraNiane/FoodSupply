"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button, Card, FormField, Input } from "@/components/ui";
import { useCart } from "@/components/cart/cart-context";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export default function TrackOrderIndexPage() {
  const router = useRouter();
  const { recentGuestOrders, isHydrated } = useCart();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [token, setToken] = React.useState("");

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    const url = token.trim()
      ? `/suivi/${encodeURIComponent(orderNumber.trim())}?token=${encodeURIComponent(token.trim())}`
      : `/suivi/${encodeURIComponent(orderNumber.trim())}`;
    router.push(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-navy-900">Suivre ma commande</h1>
      <p className="mt-1 text-sm text-slate-600">
        Retrouvez vos commandes passées sans inscription sur cet appareil ou saisissez votre numéro
        et jeton sécurisé.
      </p>

      {isHydrated && recentGuestOrders.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="text-base font-bold text-navy-900">Vos commandes récentes (cet appareil)</h2>
          <ul className="mt-4 divide-y divide-surface-border">
            {recentGuestOrders.map((ref) => (
              <li key={ref.orderNumber} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-navy-900">{ref.orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateDakar(ref.createdAt, true)} • {formatXof(ref.totalClientXof)}
                  </p>
                </div>
                <Link
                  href={ref.trackingUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ouvrir le suivi
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-base font-bold text-navy-900">Rechercher par référence</h2>
        <form onSubmit={handleLookup} className="mt-4 space-y-4">
          <FormField label="Numéro de commande" htmlFor="track-num" required>
            <Input
              id="track-num"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ex. FS-2026-00001AB"
              required
            />
          </FormField>

          <FormField
            label="Jeton de sécurité (pour commande sans compte)"
            htmlFor="track-token"
            hint="Inutile si vous êtes connecté à votre compte client."
          >
            <Input
              id="track-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Collez le jeton présent dans votre lien de suivi"
            />
          </FormField>

          <Button type="submit">
            <Search className="h-4 w-4" />
            Consulter le suivi
          </Button>
        </form>
      </Card>
    </div>
  );
}
