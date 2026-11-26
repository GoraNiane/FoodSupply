import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Headphones,
  MessageCircle,
  Package,
  ShieldAlert,
  Snowflake,
  Tag,
} from "lucide-react";
import { Alert, AvailabilityBadge, Badge, Card, buttonVariants } from "@/components/ui";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { getPublicProductBySlug } from "@/modules/catalog/queries";
import { buildProductShareMessage } from "@/modules/notifications/whatsapp";
import { formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Détail produit",
};

export default async function PublicProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dbAvailable, product } = await getPublicProductBySlug(slug);

  if (!dbAvailable) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <Alert variant="warning" title="Catalogue indisponible temporairement">
          Impossible de charger la fiche produit pour le moment.
        </Alert>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const offer = product.offer;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/catalogue"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <Card className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50/40 to-surface-subtle">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-navy-300">
                <Package className="h-20 w-20" />
                <span className="text-sm font-medium text-navy-400">{product.category.name}</span>
              </div>
            )}
          </Card>

          {product.galleryUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.galleryUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="aspect-square overflow-hidden rounded-xl border border-surface-border bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy">{product.category.name}</Badge>
              <Badge variant="neutral">Réf. {product.sku}</Badge>
              {product.storageType !== "AMBIENT" && (
                <Badge variant="info">
                  <Snowflake className="h-3 w-3" />
                  {product.storageType === "FROZEN"
                    ? "Chaîne du froid (Surgelé)"
                    : "Conservation au frais"}
                </Badge>
              )}
              {product.isFragile && (
                <Badge variant="warning">
                  <ShieldAlert className="h-3 w-3" />
                  Produit fragile
                </Badge>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-bold text-ink-900">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Conditionnement : <strong className="text-ink-900">{product.unitLabel}</strong> • Origine :{" "}
              <strong className="text-ink-900">{product.origin ?? "Sénégal"}</strong>
            </p>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
          )}

          {offer ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Prix FoodSupply
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-brand-600">
                    {formatXof(offer.clientUnitPriceXof)}
                  </p>
                </div>
                <AvailabilityBadge status={offer.availability} />
              </div>

              <div className="mt-4 grid gap-3 border-t border-surface-border pt-4 text-xs text-slate-600 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success-600" />
                  <span>Vendu & livré par FoodSupply Dakar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-navy-700" />
                  <span>Quantité min. : {offer.minOrderQty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-navy-700" />
                  <span>Délai indicatif : {offer.leadTimeHours} h</span>
                </div>
              </div>

              {product.volumeTiers.length > 0 && (
                <div className="mt-4 rounded-xl border border-success-200 bg-success-50/60 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-success-800">
                    <Tag className="h-3.5 w-3.5" />
                    Tarifs dégressifs par volume (Gros & Demi-gros)
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {product.volumeTiers.map((tier) => (
                      <div
                        key={tier.minQty}
                        className="rounded-lg border border-success-200 bg-white px-3 py-2 text-xs"
                      >
                        <span className="block text-slate-500">À partir de {tier.minQty} unités</span>
                        <strong className="text-sm font-extrabold text-success-700">
                          {formatXof(tier.unitPriceXof)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {offer.availability !== "OUT_OF_STOCK" ? (
                  <AddToCartButton
                    offerId={offer.id}
                    slug={product.slug}
                    name={product.name}
                    unitLabel={product.unitLabel}
                    categoryName={product.category.name}
                    clientUnitPriceXof={offer.clientUnitPriceXof}
                    minOrderQty={offer.minOrderQty}
                    storageType={product.storageType}
                    isFragile={product.isFragile}
                    imageUrl={product.imageUrl}
                    volumeTiers={product.volumeTiers}
                    withQuantitySelector
                  />
                ) : (
                  <Alert variant="warning">Ce produit est temporairement indisponible.</Alert>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link href="/panier" className={buttonVariants({ variant: "navy", size: "md" })}>
                    Voir mon panier
                  </Link>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      buildProductShareMessage({
                        productName: product.name,
                        unitLabel: product.unitLabel,
                        priceXof: offer.clientUnitPriceXof,
                        productUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://foodsupply.sn"}/catalogue/${product.slug}`,
                      })
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "md" })}
                  >
                    <MessageCircle className="h-4 w-4 text-success-600" />
                    Partager sur WhatsApp
                  </a>
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`Question produit : ${product.name}`)}`}
                    className={buttonVariants({ variant: "outline", size: "md" })}
                  >
                    <Headphones className="h-4 w-4" />
                    Contacter FoodSupply
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Commande directe sans compte obligatoire. La disponibilité finale est vérifiée avant
                tout règlement.
              </p>
            </Card>
          ) : (
            <Alert variant="warning" title="Produit indisponible">
              Ce produit n&apos;est pas encore actif dans le catalogue.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
