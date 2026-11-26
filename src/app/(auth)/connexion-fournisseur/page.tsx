import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { Alert, Badge, Card } from "@/components/ui";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Connexion Fournisseur",
  description: "Accédez à votre espace privé fournisseur FoodSupply pour soumettre vos produits.",
};

export default async function SupplierLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const justRegistered = sp.registered === "1";

  return (
    <Card className="border-brand-200 p-6 sm:p-8">
      <div className="mb-6 text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <Building2 className="h-6 w-6" />
        </div>
        <Badge variant="brand">Espace Fournisseur Partenaire</Badge>
        <h1 className="text-2xl font-bold text-ink-900">Connexion Fournisseur</h1>
        <p className="text-xs text-slate-500">
          Soumettez vos produits, photos, prix d&apos;approvisionnement et suivez leur validation.
        </p>
      </div>

      {justRegistered && (
        <div className="mb-5">
          <Alert variant="success" title="Compte fournisseur créé !">
            Connectez-vous maintenant avec votre e-mail et mot de passe pour proposer vos premiers
            produits à FoodSupply.
          </Alert>
        </div>
      )}

      <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-surface-subtle" />}>
        <LoginForm
          portal="SUPPLIER"
          defaultCallbackUrl="/fournisseur"
          placeholderEmail="contact@monentreprise.sn"
        />
      </Suspense>

      <p className="mt-5 text-center text-xs text-slate-500">
        Pas encore de compte fournisseur ?{" "}
        <Link href="/devenir-fournisseur" className="font-semibold text-brand-600 hover:underline">
          S&apos;inscrire comme fournisseur
        </Link>
      </p>
    </Card>
  );
}
