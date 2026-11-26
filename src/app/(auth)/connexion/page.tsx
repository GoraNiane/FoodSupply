import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Connexion Client",
  description: "Connectez-vous à votre espace client professionnel FoodSupply (facultatif).",
};

export default function ClientLoginPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Espace Client</h1>
        <p className="mt-1 text-sm text-slate-500">
          Réservé aux restaurants & clients professionnels (facultatif)
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-subtle p-1 text-center text-sm font-medium">
        <span className="rounded-lg bg-white py-2 font-semibold text-ink-900 shadow-xs">
          Connexion
        </span>
        <Link
          href="/inscription"
          className="rounded-lg py-2 text-slate-500 transition-colors hover:text-ink-900"
        >
          Créer un compte
        </Link>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-subtle" />}>
        <LoginForm
          portal="CLIENT"
          defaultCallbackUrl="/restaurant"
          placeholderEmail="contact@monrestaurant.sn"
        />
      </Suspense>
    </Card>
  );
}
