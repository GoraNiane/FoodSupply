import type { Metadata } from "next";
import Link from "next/link";
import { Badge, buttonVariants } from "@/components/ui";
import { FaqAccordion, type FaqItem } from "@/components/public/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Réponses aux questions fréquentes sur FoodSupply à Dakar.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    category: "Commandes",
    question: "Pourquoi ma commande doit-elle être confirmée avant le paiement ?",
    answer:
      "Sur le marché alimentaire à Dakar, les stocks frais et les prix de gros peuvent varier au quotidien. FoodSupply confirme les quantités disponibles et les tarifs exacts auprès de chaque fournisseur avant de vous présenter le montant définitif. Vous ne payez jamais un montant non confirmé.",
  },
  {
    category: "Commandes",
    question: "Puis-je commander auprès de plusieurs fournisseurs dans le même panier ?",
    answer:
      "Oui. C'est l'avantage principal de FoodSupply : vous ajoutez par exemple des œufs, du poulet, de la farine et des emballages dans un seul panier. FoodSupply répartit automatiquement la commande en sous-commandes fournisseurs et consolide la livraison.",
  },
  {
    category: "Paiements",
    question: "Quels moyens de paiement sont acceptés ?",
    answer:
      "FoodSupply prévoit le règlement via Wave, Orange Money, carte bancaire et virement bancaire selon les prestataires actifs. Une facture PDF numérotée est générée automatiquement après confirmation du paiement.",
  },
  {
    category: "Livraisons",
    question: "Comment sont gérés les produits surgelés ou fragiles (œufs) ?",
    answer:
      "Les produits sont marqués selon leur contrainte (frais, surgelé, fragile). Les commandes contenant des produits sensibles sont affectées prioritairement aux livreurs équipés de caissons isothermes ou véhicules adaptés.",
  },
  {
    category: "Fournisseurs",
    question: "Combien de temps prend la validation d'un compte fournisseur ?",
    answer:
      "Dès réception de vos pièces (NINEA, RC, pièce d'identité, adresse de collecte), notre équipe procède à la vérification sous 24 à 48 heures ouvrées avant d'activer vos offres dans le catalogue.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <Badge variant="brand">Centre d&apos;aide</Badge>
        <h1 className="text-3xl font-extrabold text-navy-900">Questions fréquentes (FAQ)</h1>
        <p className="text-sm text-slate-600">
          Tout savoir sur le fonctionnement des commandes, paiements, livraisons et partenariats
          FoodSupply.
        </p>
      </div>

      <FaqAccordion items={FAQ_ITEMS} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-surface-border bg-white p-6 shadow-card">
        <div>
          <p className="text-base font-bold text-navy-900">Vous n&apos;avez pas trouvé votre réponse ?</p>
          <p className="text-sm text-slate-600">
            Notre équipe support basée à Dakar est disponible 6j/7.
          </p>
        </div>
        <Link href="/contact" className={buttonVariants({ variant: "primary" })}>
          Contacter le support
        </Link>
      </div>
    </div>
  );
}
