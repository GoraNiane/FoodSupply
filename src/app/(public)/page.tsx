import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
} from "lucide-react";
import { Badge, Card, EmptyState, buttonVariants } from "@/components/ui";
import { ProductCard } from "@/components/catalog/product-card";
import { resolveCategoryImage } from "@/modules/catalog/category-images";
import { getPublicCategories, searchPublicCatalog } from "@/modules/catalog/queries";

export const dynamic = "force-dynamic";

const FALLBACK_CATEGORIES = [
  { slug: "oeufs", name: "Œufs" },
  { slug: "poulet-viande", name: "Poulet & Viande" },
  { slug: "poissons", name: "Poissons" },
  { slug: "farine", name: "Farine" },
  { slug: "huile", name: "Huile" },
  { slug: "produits-laitiers", name: "Fromages & Laitiers" },
  { slug: "sauces-condiments", name: "Sauces & Condiments" },
  { slug: "surgeles", name: "Surgelés" },
  { slug: "fruits-legumes", name: "Fruits & Légumes" },
  { slug: "emballages", name: "Emballages" },
];

export default async function HomePage() {
  const [{ categories }, catalog] = await Promise.all([
    getPublicCategories(),
    searchPublicCatalog({ pageSize: 8 }),
  ]);

  const displayedCategories =
    categories.length > 0
      ? categories
      : FALLBACK_CATEGORIES.map((c) => ({
        ...c,
        id: c.slug,
        iconName: null,
        imageUrl: null,
        productCount: 0,
      }));

  return (
    <div>
      {/* HERO BANNIÈRE — DIMENSIONS EXACTES DE LA PHOTO ORIGINALE (AUCUN RECADRAGE, ZÉRO COLLISION) */}
      <section className="overflow-hidden border-b border-surface-border bg-white">
        <div className="relative w-full">
          {/* Image affichée dans son ratio et ses proportions exactes d'origine (w-full h-auto) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-dakar-foodsupply.jpg"
            alt="Chef FoodSupply Dakar avec produits alimentaires professionnels"
            fetchPriority="high"
            decoding="async"
            className="block h-auto w-full select-none"
          />

          {/* Texte superposé uniquement dans la zone claire à gauche, sous le header transparent */}
          <div className="absolute inset-0 flex items-center pt-12 sm:pt-16">
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="max-w-[44%] space-y-1 sm:max-w-[45%] sm:space-y-3 lg:max-w-[46%] lg:space-y-4">
                <div className="hidden items-center gap-1.5 rounded-full border border-brand-200 bg-white/90 px-3 py-1 text-xs font-semibold text-navy-900 shadow-xs sm:inline-flex">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <span>Dakar, Sénégal</span>
                  <span className="hidden text-slate-300 md:inline">•</span>
                  <span className="hidden italic text-brand-700 md:inline">
                    Ensemble, nourrissons Dakar !
                  </span>
                </div>

                <h1 className="text-[13px] font-extrabold leading-snug tracking-tight text-ink-900 sm:text-2xl md:text-3xl lg:text-5xl lg:leading-[1.12]">
                  Votre partenaire d&apos;approvisionnement alimentaire{" "}
                  <span className="text-brand-600">B2B à Dakar</span>
                </h1>

                <p className="text-[10px] leading-tight text-navy-900/85 sm:text-sm lg:text-lg lg:leading-relaxed">
                  Commandez vos ingrédients professionnels simplement, sans inscription obligatoire.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BANDE BASSE STRUCTURANTE BLEU PROFOND / NOIR */}
        <div className="border-t border-navy-800 bg-gradient-to-r from-ink-900 via-navy-900 to-navy-800 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 font-medium text-navy-100">
              <MapPin className="h-4 w-4 shrink-0 text-brand-400" />
              <span>Dakar, Sénégal — Livraison dans tous les quartiers</span>
            </div>
            <span className="text-navy-200">Devise : FCFA (XOF)</span>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Approvisionnement complet
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink-900">Nos catégories produits</h2>
          </div>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Voir tout le catalogue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {displayedCategories.map((cat) => {
            const imgSrc = resolveCategoryImage(cat.slug, cat.imageUrl);
            return (
              <Link
                key={cat.slug}
                href={`/catalogue?category=${cat.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-elevated"
              >
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-white p-3">
                  {imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Package className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="border-t border-surface-border/70 bg-surface-muted/40 px-3 py-3 text-center">
                  <h3 className="text-sm font-semibold text-ink-900 group-hover:text-brand-600 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.productCount > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {cat.productCount} article{cat.productCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="border-y border-surface-border bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Boutique directe FoodSupply Dakar
              </p>
              <h2 className="mt-1 text-2xl font-bold text-ink-900">Produits disponibles</h2>
            </div>
            <Link href="/catalogue" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Explorer le catalogue complet
            </Link>
          </div>

          <div className="mt-7">
            {catalog.items.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {catalog.items.map((product) => (
                  <ProductCard key={product.offerId} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="Votre boutique est prête pour vos articles"
                description={
                  catalog.dbAvailable
                    ? "Connectez-vous à votre espace Admin pour publier vos premiers articles avec vos photos et prix FCFA."
                    : "Branchez votre URL TiDB Cloud dans .env puis publiez vos articles, photos et prix depuis /admin/produits."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
                      Voir le catalogue
                    </Link>
                    <Link href="/connexion-admin" className={buttonVariants({ variant: "navy" })}>
                      Accès Admin Vendeur
                    </Link>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </section>

      {/* CTA B2B RESTAURANTS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-navy-900 to-ink-900 p-8 text-white">
            <Badge variant="brand" className="bg-brand-500/20 text-brand-300">
              Restaurants, Fast-Foods, Hôtels & Traiteurs
            </Badge>
            <h3 className="mt-3 text-2xl font-bold">
              Commandez vos ingrédients en 2 minutes, sans créer de compte
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">
              Sélectionnez vos produits, indiquez votre adresse à Dakar et recevez la confirmation
              définitive des stocks et des tarifs avant de régler.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-navy-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                Commande express sans inscription obligatoire
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                Lien de suivi sécurisé et facture professionnelle FCFA
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
                Commander maintenant
              </Link>
              <Link
                href="/suivi"
                className={buttonVariants({
                  variant: "outline",
                  className: "border-navy-600 bg-transparent text-white hover:bg-navy-800 hover:text-white",
                })}
              >
                Suivre une commande
              </Link>
            </div>
          </Card>

          <Card className="border-brand-200 bg-brand-50/50 p-8">
            <Badge variant="navy">Compte Client Professionnel (Facultatif)</Badge>
            <h3 className="mt-3 text-2xl font-bold text-ink-900">
              Vous commandez chaque semaine ?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Créez gratuitement un compte professionnel pour enregistrer vos adresses de cuisine à
              Dakar, retrouver tout votre historique et télécharger vos factures en un clic.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/inscription" className={buttonVariants({ variant: "navy" })}>
                Créer un compte client
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
                Nous contacter
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
