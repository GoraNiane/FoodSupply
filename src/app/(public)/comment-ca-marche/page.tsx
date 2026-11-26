import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Badge, Card, ORDER_CHECKOUT_STEPS, Stepper, buttonVariants } from "@/components/ui";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "Découvrez le parcours de commande B2B multi-fournisseurs avec confirmation préalable sur FoodSupply.",
};

const STEPS_DETAIL = [
  {
    number: "01",
    icon: <ShoppingCart className="h-6 w-6 text-brand-500" />,
    title: "Composez votre panier multi-fournisseurs",
    desc: "Sélectionnez vos ingrédients (œufs, volailles, farine, huile, surgelés, emballages) auprès de plusieurs fournisseurs vérifiés et soumettez votre demande.",
  },
  {
    number: "02",
    icon: <ClipboardCheck className="h-6 w-6 text-navy-700" />,
    title: "Confirmation des stocks et prix par les fournisseurs",
    desc: "FoodSupply éclate automatiquement votre commande par fournisseur. Chacun confirme les quantités et tarifs. Si un prix ou un stock change, vous recevez une proposition claire à accepter ou refuser.",
  },
  {
    number: "03",
    icon: <CreditCard className="h-6 w-6 text-success-600" />,
    title: "Paiement sécurisé du montant définitif",
    desc: "Vous ne payez jamais un montant non confirmé. Réglez en toute sécurité (Wave, Orange Money, carte ou virement) et téléchargez immédiatement votre facture PDF.",
  },
  {
    number: "04",
    icon: <Truck className="h-6 w-6 text-brand-500" />,
    title: "Collecte consolidée & livraison à votre cuisine",
    desc: "Nos livreurs partenaires collectent vos produits chez chaque fournisseur (avec gestion chaîne du froid et produits fragiles), vous livrent en une fois et enregistrent la preuve de livraison.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-3">
        <Badge variant="brand">Processus transparent B2B</Badge>
        <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Comment fonctionne FoodSupply ?
        </h1>
        <p className="text-base text-slate-600">
          Un workflow pensé pour les réalités du marché alimentaire à Dakar : vérification réelle
          avant paiement et logistique centralisée.
        </p>
      </div>

      <div className="mt-8">
        <Stepper steps={ORDER_CHECKOUT_STEPS} currentStepIndex={1} />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {STEPS_DETAIL.map((step) => (
          <Card key={step.number} className="p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-subtle">
                {step.icon}
              </span>
              <span className="text-2xl font-black text-navy-100">{step.number}</span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-navy-900">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-10 border-success-500/30 bg-success-50/50 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success-600" />
            <div>
              <h3 className="text-base font-bold text-navy-900">
                Garantie FoodSupply : aucun prélèvement sans accord final
              </h3>
              <p className="text-sm text-slate-600">
                Votre commande n&apos;est débitée qu&apos;une fois le montant définitif approuvé.
              </p>
            </div>
          </div>
          <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
            Parcourir le catalogue
          </Link>
        </div>
      </Card>
    </div>
  );
}
