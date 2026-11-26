import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ShieldCheck, Truck, Users } from "lucide-react";
import { Badge, Card, buttonVariants } from "@/components/ui";

export const metadata: Metadata = {
  title: "À propos",
  description: "Découvrez la mission de FoodSupply pour les professionnels de la restauration à Dakar.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-4">
        <Badge variant="brand">À propos de FoodSupply</Badge>
        <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Digitaliser et fiabiliser la chaîne d&apos;approvisionnement alimentaire à Dakar
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          FoodSupply est née d&apos;un constat simple sur le terrain dakarois : les restaurateurs,
          fast-foods, boulangeries, hôtels et traiteurs perdent chaque semaine des heures à appeler
          des dizaines de fournisseurs, comparer des prix variables et organiser eux-mêmes le
          transport de leurs marchandises.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          {
            icon: <Building2 className="h-6 w-6 text-brand-500" />,
            title: "Marketplace administrée",
            desc: "Chaque fournisseur est audité et validé manuellement (NINEA, RC, agréments) avant de vendre sur la plateforme.",
          },
          {
            icon: <ShieldCheck className="h-6 w-6 text-success-600" />,
            title: "Transparence & fiabilité",
            desc: "Les prix et quantités sont confirmés avant tout paiement. Chaque commande génère une facture PDF conforme.",
          },
          {
            icon: <Truck className="h-6 w-6 text-navy-700" />,
            title: "Logistique multi-fournisseurs",
            desc: "Un seul livreur partenaire collecte chez plusieurs grossistes et livre en une tournée avec respect de la chaîne du froid.",
          },
        ].map((item) => (
          <Card key={item.title} className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-subtle">
              {item.icon}
            </div>
            <h2 className="mt-4 text-lg font-bold text-navy-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-12 flex flex-col items-start justify-between gap-6 bg-navy-900 p-8 text-white sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-400">
            <Users className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Équipe Dakar</span>
          </div>
          <h2 className="text-2xl font-bold">Prêt à structurer vos achats alimentaires ?</h2>
          <p className="text-sm text-navy-200">
            Rejoignez FoodSupply comme restaurant, fournisseur ou livreur partenaire.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/inscription" className={buttonVariants({ variant: "primary" })}>
            Créer un compte
          </Link>
          <Link
            href="/contact"
            className={buttonVariants({
              variant: "outline",
              className: "border-navy-600 bg-transparent text-white hover:bg-navy-800 hover:text-white",
            })}
          >
            Nous contacter
          </Link>
        </div>
      </Card>
    </div>
  );
}
