import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Lock, PackagePlus, ShieldCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { SupplierRegisterForm } from "@/components/forms/supplier-register-form";

export const metadata: Metadata = {
  title: "Devenir fournisseur",
  description:
    "Inscrivez gratuitement votre entreprise et soumettez vos produits alimentaires à l'équipe FoodSupply Dakar.",
};

export default function BecomeSupplierPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <Badge variant="brand">Partenaires d&apos;approvisionnement Dakar</Badge>
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Devenir fournisseur partenaire FoodSupply
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Créez librement votre compte fournisseur, proposez vos produits avec photos, quantités
            disponibles et prix d&apos;approvisionnement. Notre équipe commerciale examine chaque
            proposition, négocie avec vous et commercialise vos marchandises auprès des restaurants
            de Dakar.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: <PackagePlus className="h-5 w-5 text-brand-600" />,
                title: "Soumission libre de vos produits",
                desc: "Ajoutez plusieurs photos, votre prix d'approvisionnement en FCFA, votre unité de vente et vos disponibilités.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5 text-navy-700" />,
                title: "Validation & contrôle qualité FoodSupply",
                desc: "Chaque proposition est examinée par notre administration avant toute mise en vente au catalogue.",
              },
              {
                icon: <Lock className="h-5 w-5 text-ink-900" />,
                title: "Confidentialité commerciale garantie",
                desc: "Vos tarifs d'approvisionnement, quantités et coordonnées restent strictement privés entre vous et FoodSupply.",
              },
            ].map((item) => (
              <Card key={item.title} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  {item.icon}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-900">{item.title}</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="rounded-xl border border-surface-border bg-white p-4 text-xs text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-ink-900">
              <CheckCircle2 className="h-4 w-4 text-success-600" />
              Déjà partenaire fournisseur ?
            </p>
            <p className="mt-1">
              Accédez directement à votre espace dédié pour suivre le statut de vos produits :{" "}
              <Link href="/connexion-fournisseur" className="font-semibold text-brand-600 underline">
                Connexion fournisseur →
              </Link>
            </p>
          </div>
        </div>

        <Card className="p-6 sm:p-8 lg:col-span-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-ink-900">Inscription fournisseur gratuite</h2>
            <p className="mt-1 text-xs text-slate-500">
              Renseignez les informations de votre entreprise pour accéder immédiatement à votre
              espace personnel de soumission de produits.
            </p>
          </div>
          <SupplierRegisterForm />
        </Card>
      </div>
    </div>
  );
}
