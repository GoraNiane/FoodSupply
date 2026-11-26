import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <Badge variant="navy">Protection des données</Badge>
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900">Politique de confidentialité</h1>
      <p className="mt-2 text-xs text-slate-500">
        Conformité Loi n° 2008-12 sur la protection des données à caractère personnel (Sénégal)
      </p>

      <Card className="mt-8 space-y-6 p-6 text-sm leading-relaxed text-slate-600 sm:p-8">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">1. Données collectées</h2>
          <p>
            FoodSupply collecte uniquement les données strictement nécessaires à la gestion des
            comptes professionnels, au traitement des commandes, à la vérification réglementaire
            (KYC fournisseurs/livreurs), à la facturation et au suivi des livraisons : identité du
            contact, raison sociale, NINEA/RC, adresses de livraison/collecte, coordonnées
            téléphoniques et historiques de transactions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">2. Sécurité & confidentialité</h2>
          <p>
            Les mots de passe sont chiffrés de manière irréversible (hachage bcrypt sécurisé). Les
            accès aux données sont strictement cloisonnés par rôle et par établissement. Les
            documents justificatifs et factures sont protégés par des contrôles d&apos;autorisation
            côté serveur et journalisés dans notre système d&apos;audit.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy-900">3. Vos droits</h2>
          <p>
            Conformément à la législation sénégalaise, vous disposez d&apos;un droit d&apos;accès,
            de rectification et de suppression de vos données personnelles (sous réserve des
            obligations légales de conservation comptable des factures). Pour exercer vos droits :{" "}
            <strong className="text-navy-900">contact@foodsupply.sn</strong>.
          </p>
        </section>
      </Card>
    </div>
  );
}
