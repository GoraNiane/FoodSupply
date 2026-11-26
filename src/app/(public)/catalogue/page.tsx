import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Package, Search, SlidersHorizontal } from "lucide-react";
import type { AvailabilityStatus } from "@prisma/client";
import { Button, Card, EmptyState, Input, Select, buttonVariants } from "@/components/ui";
import { ProductCard } from "@/components/catalog/product-card";
import { resolveCategoryImage } from "@/modules/catalog/category-images";
import {
  getPublicCategories,
  searchPublicCatalog,
} from "@/modules/catalog/queries";
import { getPaymentConfig } from "@/modules/payments/settings";
import {
  buildMissingProductRequestMessage,
  buildWhatsAppLink,
} from "@/modules/notifications/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue B2B",
  description:
    "Commandez vos produits alimentaires professionnels directement sur FoodSupply Dakar, sans inscription obligatoire.",
};

export default async function PublicCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const category = typeof sp.category === "string" && sp.category ? sp.category : undefined;
  const availability =
    sp.availability === "IN_STOCK" || sp.availability === "ON_CONFIRMATION"
      ? (sp.availability as AvailabilityStatus)
      : undefined;
  const maxPriceXof =
    typeof sp.maxPrice === "string" && Number(sp.maxPrice) > 0 ? Number(sp.maxPrice) : undefined;
  const sort =
    sp.sort === "price_asc" || sp.sort === "price_desc" ? sp.sort : "relevance";
  const page = typeof sp.page === "string" && Number(sp.page) > 0 ? Number(sp.page) : 1;

  const [{ categories }, catalog, paymentConfig] = await Promise.all([
    getPublicCategories(),
    searchPublicCatalog({ q, category, availability, maxPriceXof, sort, page, pageSize: 12 }),
    getPaymentConfig(),
  ]);

  const missingProductWaUrl = buildWhatsAppLink(
    paymentConfig.whatsappSupportPhone,
    buildMissingProductRequestMessage(q)
  );

  const buildPageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (category) query.set("category", category);
    if (availability) query.set("availability", availability);
    if (maxPriceXof) query.set("maxPrice", String(maxPriceXof));
    if (sort !== "relevance") query.set("sort", sort);
    query.set("page", String(targetPage));
    return `/catalogue?${query.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Catalogue FoodSupply Dakar
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink-900">Catalogue des produits</h1>
          <p className="mt-1 text-sm text-slate-600">
            Prix exprimés en FCFA (XOF). Ajoutez directement vos produits au panier et commandez
            sans créer de compte.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {catalog.total} produit{catalog.total > 1 ? "s" : ""} disponible
          {catalog.total > 1 ? "s" : ""}
        </p>
      </div>

      {/* BARRE VISUELLE DES CATÉGORIES */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        <Link
          href="/catalogue"
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
            !category
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-surface-border bg-white text-ink-900 hover:border-brand-300"
          }`}
        >
          Toutes les catégories
        </Link>
        {(categories.length > 0
          ? categories
          : [
              { slug: "oeufs", name: "Œufs", imageUrl: null },
              { slug: "poulet-viande", name: "Poulet & Viande", imageUrl: null },
              { slug: "poissons", name: "Poissons", imageUrl: null },
              { slug: "farine", name: "Farine", imageUrl: null },
              { slug: "huile", name: "Huile", imageUrl: null },
              { slug: "produits-laitiers", name: "Fromages & Laitiers", imageUrl: null },
              { slug: "sauces-condiments", name: "Sauces & Condiments", imageUrl: null },
              { slug: "surgeles", name: "Surgelés", imageUrl: null },
              { slug: "fruits-legumes", name: "Fruits & Légumes", imageUrl: null },
              { slug: "emballages", name: "Emballages", imageUrl: null },
            ]
        ).map((cat) => {
          const thumb = resolveCategoryImage(cat.slug, cat.imageUrl);
          const active = category === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={`/catalogue?category=${cat.slug}`}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-surface-border bg-white text-ink-900 hover:border-brand-300"
              }`}
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={cat.name} className="h-7 w-7 rounded-lg object-cover" />
              )}
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>

      {/* BARRE DE RECHERCHE & FILTRES (100 % FOODSUPPLY — AUCUN FILTRE FOURNISSEUR) */}
      <Card className="mb-8 p-5">
        <form method="GET" action="/catalogue" className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label htmlFor="q" className="mb-1.5 block text-xs font-semibold text-ink-900">
              Rechercher un produit
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="q"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Ex. Œufs, poulet, farine 25 kg..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="category" className="mb-1.5 block text-xs font-semibold text-ink-900">
              Catégorie
            </label>
            <Select id="category" name="category" defaultValue={category ?? ""}>
              <option value="">Toutes</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="availability"
              className="mb-1.5 block text-xs font-semibold text-ink-900"
            >
              Disponibilité
            </label>
            <Select id="availability" name="availability" defaultValue={availability ?? ""}>
              <option value="">Toutes</option>
              <option value="IN_STOCK">En stock</option>
              <option value="ON_CONFIRMATION">Sur confirmation</option>
            </Select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="sort" className="mb-1.5 block text-xs font-semibold text-ink-900">
              Trier par
            </label>
            <Select id="sort" name="sort" defaultValue={sort}>
              <option value="relevance">Pertinence (A-Z)</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 md:col-span-12">
            <div className="w-full sm:w-56">
              <label htmlFor="maxPrice" className="mb-1.5 block text-xs font-semibold text-ink-900">
                Prix maximum (FCFA)
              </label>
              <Input
                id="maxPrice"
                name="maxPrice"
                type="number"
                min={0}
                step={500}
                defaultValue={maxPriceXof ?? ""}
                placeholder="Ex. 25000"
              />
            </div>

            <div className="flex gap-2">
              <Link href="/catalogue" className={buttonVariants({ variant: "outline", size: "md" })}>
                Réinitialiser
              </Link>
              <Button type="submit" variant="navy">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrer
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* RÉSULTATS */}
      {catalog.items.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.items.map((product) => (
              <ProductCard key={product.offerId} product={product} />
            ))}
          </div>

          {catalog.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {catalog.page > 1 && (
                <Link
                  href={buildPageHref(catalog.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Précédent
                </Link>
              )}
              <span className="text-sm font-medium text-ink-900">
                Page {catalog.page} sur {catalog.totalPages}
              </span>
              {catalog.page < catalog.totalPages && (
                <Link
                  href={buildPageHref(catalog.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Suivant
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Aucun produit trouvé"
          description={
            catalog.dbAvailable
              ? "Aucun produit publié ne correspond à vos critères actuels."
              : "La base de données est momentanément indisponible."
          }
          action={
            <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
              Réinitialiser les filtres
            </Link>
          }
        />
      )}

      {/* BANNIÈRE WHATSAPP « PRODUIT ABSENT DU CATALOGUE ? » */}
      {missingProductWaUrl && (
        <Card className="mt-10 border-success-200 bg-gradient-to-r from-success-50/70 to-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-navy-900">
                Vous cherchez un produit absent du catalogue ?
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Notre équipe Dakar source directement sur demande (viandes, poissons, produits
                importés, emballages sur-mesure). Réponse rapide sur WhatsApp.
              </p>
            </div>
            <a
              href={missingProductWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-success-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-success-700"
            >
              <MessageCircle className="h-4 w-4" />
              Demander ce produit sur WhatsApp
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
