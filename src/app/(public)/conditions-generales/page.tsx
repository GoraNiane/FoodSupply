import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Conditions générales",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <Badge variant="navy">Cadre contractuel B2B</Badge>
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900">
        Conditions Générales d&apos;Utilisation et de Vente (CGU / CGV)
      </h1>
      <p className="mt-2 text-xs text-slate-500">Dernière mise à jour : Novembre 2026 — Dakar, Sénégal</p>

      <Card className="mt-8 space-y-6 p-6 text-sm leading-relaxed text-slate-600 sm:p-8">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">1. Objet de la plateforme</h2>
          <p>
            FoodSupply Sénégal SARL exploite une marketplace B2B administrée dédiée à
            l&apos;approvisionnement des professionnels de la restauration au Sénégal. La plateforme
            est réservée aux professionnels (restaurants, fast-foods, hôtels, boulangeries,
            pâtisseries, traiteurs) et aux fournisseurs/livreurs préalablement validés.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">2. Processus de commande et prix</h2>
          <p>
            Les prix affichés dans le catalogue sont exprimés en Francs CFA (XOF). La soumission
            d&apos;un panier constitue une demande de commande soumise à confirmation préalable des
            stocks et des prix par les fournisseurs concernés. En cas d&apos;ajustement de quantité
            ou de tarif, une proposition révisée est soumise au client, qui reste libre de
            l&apos;accepter ou de l&apos;annuler sans frais avant tout paiement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">3. Paiements et facturation</h2>
          <p>
            Le règlement s&apos;effectue uniquement après validation définitive du récapitulatif de
            commande, via les prestataires de paiement agréés disponibles sur la plateforme. Les
            reversements dus aux fournisseurs et livreurs sont suivis et exécutés dans le strict
            respect de la réglementation financière applicable au Sénégal et en zone UEMOA/BCEAO.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">4. Collecte, livraison et réclamations</h2>
          <p>
            Les livraisons sont effectuées à l&apos;adresse indiquée lors de la commande, avec
            enregistrement d&apos;une preuve de livraison. Toute non-conformité ou produit manquant
            doit être signalé dès la réception via le support FoodSupply pour examen et
            remboursement éventuel.
          </p>
        </section>
      </Card>
    </div>
  );
}
