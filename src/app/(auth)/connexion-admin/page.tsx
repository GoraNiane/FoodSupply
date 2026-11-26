import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Connexion Vendeur / Administration",
  description: "Portail sécurisé réservé exclusivement au vendeur et administrateur FoodSupply.",
};

export default function AdminLoginPage() {
  return (
    <Card className="border-brand-200 p-6 sm:p-8">
      <div className="mb-6 text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white">
          <ShieldCheck className="h-6 w-6 text-brand-400" />
        </div>
        <Badge variant="navy">Portail Privé Vendeur</Badge>
        <h1 className="text-2xl font-bold text-ink-900">Administration FoodSupply</h1>
        <p className="text-xs text-slate-500">
          Accès strictement séparé des comptes clients — réservé à la gestion de vos articles, prix
          et commandes.
        </p>
      </div>

      <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-surface-subtle" />}>
        <LoginForm
          portal="ADMIN"
          defaultCallbackUrl="/admin"
          placeholderEmail="admin@foodsupply.sn"
        />
      </Suspense>
    </Card>
  );
}
