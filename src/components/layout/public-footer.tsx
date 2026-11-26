import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-navy-800 bg-ink-900 text-navy-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo href="/" variant="dark" subtitle="Marketplace B2B Dakar" />
            <p className="text-sm leading-relaxed text-navy-200">
              La plateforme d&apos;approvisionnement alimentaire dédiée aux restaurants, fast-foods,
              boulangeries, hôtels et traiteurs à Dakar.
            </p>
            <ul className="space-y-2 text-xs text-navy-200">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" />
                Sacré-Cœur 3, VDN, Dakar, Sénégal
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-400" />
                +221 33 820 45 00
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400" />
                contact@foodsupply.sn
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Plateforme</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              <li>
                <Link href="/catalogue" className="hover:text-brand-400 transition-colors">
                  Catalogue produits
                </Link>
              </li>
              <li>
                <Link href="/comment-ca-marche" className="hover:text-brand-400 transition-colors">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className="hover:text-brand-400 transition-colors">
                  À propos de FoodSupply
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand-400 transition-colors">
                  Questions fréquentes (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Partenaires</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              <li>
                <Link href="/devenir-fournisseur" className="hover:text-brand-400 transition-colors">
                  Devenir fournisseur partenaire
                </Link>
              </li>
              <li>
                <Link href="/devenir-livreur" className="hover:text-brand-400 transition-colors">
                  Devenir livreur partenaire
                </Link>
              </li>
              <li>
                <Link href="/inscription" className="hover:text-brand-400 transition-colors">
                  Ouvrir un compte restaurant
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-400 transition-colors">
                  Contacter l&apos;équipe commerciale
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Légal & Confiance</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              <li>
                <Link href="/conditions-generales" className="hover:text-brand-400 transition-colors">
                  Conditions générales (CGU/CGV)
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite"
                  className="hover:text-brand-400 transition-colors"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/connexion-fournisseur" className="hover:text-brand-400 transition-colors">
                  Espace fournisseur
                </Link>
              </li>
              <li>
                <Link href="/connexion-admin" className="hover:text-brand-400 transition-colors">
                  Administration FoodSupply
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-navy-800 pt-6 text-xs text-navy-300 sm:flex-row">
          <p>© {new Date().getFullYear()} FoodSupply Sénégal SARL. Tous droits réservés.</p>
          <p>Devise : FCFA (XOF) • Zone de couverture : Dakar & périphérie</p>
        </div>
      </div>
    </footer>
  );
}
