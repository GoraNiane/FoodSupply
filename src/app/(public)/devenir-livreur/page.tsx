import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Badge, Card, buttonVariants } from "@/components/ui";

export const metadata: Metadata = {
  title: "Devenir livreur partenaire",
  description: "Rejoignez le réseau de livreurs B2B FoodSupply à Dakar.",
};

export default function BecomeDriverPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Badge variant="brand">Partenaires Logistiques</Badge>
          <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">
            Assurez des tournées B2B rentables dans tout Dakar
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Vous disposez d&apos;une moto cargo, d&apos;un tricycle, d&apos;une fourgonnette ou d&apos;un
            véhicule frigorifique ? Rejoignez FoodSupply pour réaliser des collectes multi-fournisseurs
            planifiées vers nos restaurants clients.
          </p>

          <div className="grid gap-4 pt-3 sm:grid-cols-3">
            {[
              {
                icon: <Truck className="h-5 w-5 text-brand-500" />,
                title: "Missions structurées",
                desc: "Points de collecte clairs, contacts précis et heures convenues.",
              },
              {
                icon: <MapPin className="h-5 w-5 text-navy-700" />,
                title: "Zones optimisées",
                desc: "Plateau, Almadies, Mermoz, Sacré-Cœur, Parcelles, Thiaroye.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5 text-success-600" />,
                title: "Rémunération transparente",
                desc: "Forfait de base + bonus par point de collecte supplémentaire.",
              },
            ].map((item) => (
              <Card key={item.title} className="p-4">
                {item.icon}
                <h2 className="mt-3 text-sm font-bold text-navy-900">{item.title}</h2>
                <p className="mt-1 text-xs text-slate-600">{item.desc}</p>
              </Card>
            ))}
          </div>

          <div className="pt-4">
            <Link
              href="/inscription?role=DRIVER"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Postuler comme livreur partenaire
            </Link>
          </div>
        </div>

        <Card className="h-fit p-6 lg:col-span-5">
          <h2 className="text-lg font-bold text-navy-900">Critères d&apos;éligibilité</h2>
          <ul className="mt-4 space-y-3 text-sm text-navy-900">
            {[
              "Permis de conduire valide adapté au véhicule",
              "Véhicule propre et adapté au transport alimentaire",
              "Équipement isotherme ou caisson froid (fortement valorisé)",
              "Smartphone connecté pour confirmer collectes et preuves de livraison",
              "Ponctualité et sens du service professionnel",
            ].map((req) => (
              <li key={req} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
