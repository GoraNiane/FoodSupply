import Link from "next/link";
import { Package, Snowflake, ShieldAlert, CheckCircle2, Tag } from "lucide-react";
import type { AvailabilityStatus, StorageType } from "@prisma/client";
import { AvailabilityBadge, Badge } from "@/components/ui";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { VolumePriceTier } from "@/modules/catalog/pricing";
import { formatXof } from "@/lib/utils/format";

export interface CatalogProductCardData {
  slug: string;
  name: string;
  categoryName: string;
  unitLabel: string;
  imageUrl?: string | null;
  storageType: StorageType;
  isFragile: boolean;
  clientUnitPriceXof: number;
  availability: AvailabilityStatus;
  minOrderQty: number;
  offerId: string;
  volumeTiers?: VolumePriceTier[];
}

export function ProductCard({
  product,
  detailBasePath = "/catalogue",
}: {
  product: CatalogProductCardData;
  detailBasePath?: string;
}) {
  const detailUrl = `${detailBasePath}/${product.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <Link
        href={detailUrl}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-navy-50 to-surface-subtle"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-navy-300">
            <Package className="h-12 w-12" />
            <span className="text-xs font-medium text-navy-400">{product.categoryName}</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <AvailabilityBadge status={product.availability} />
        </div>

        {(product.storageType !== "AMBIENT" || product.isFragile) && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {product.storageType !== "AMBIENT" && (
              <Badge variant="info">
                <Snowflake className="h-3 w-3" />
                {product.storageType === "FROZEN" ? "Surgelé" : "Frais"}
              </Badge>
            )}
            {product.isFragile && (
              <Badge variant="warning">
                <ShieldAlert className="h-3 w-3" />
                Fragile
              </Badge>
            )}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-brand-600">{product.categoryName}</p>
        <Link href={detailUrl} className="mt-1">
          <h3 className="line-clamp-2 text-base font-semibold text-navy-900 group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-slate-500">{product.unitLabel}</p>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
          <span className="truncate">FoodSupply Dakar • Vérifié</span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold text-navy-900">
              {formatXof(product.clientUnitPriceXof)}
            </p>
            <span className="text-[11px] text-slate-500">Min. {product.minOrderQty}</span>
          </div>

          {product.volumeTiers && product.volumeTiers.length > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-success-700">
              <Tag className="h-3 w-3" />
              Dès {product.volumeTiers[0]!.minQty} u. :{" "}
              {formatXof(product.volumeTiers[0]!.unitPriceXof)}
            </p>
          )}

          <div className="mt-3">
            {product.availability !== "OUT_OF_STOCK" ? (
              <AddToCartButton
                offerId={product.offerId}
                slug={product.slug}
                name={product.name}
                unitLabel={product.unitLabel}
                categoryName={product.categoryName}
                clientUnitPriceXof={product.clientUnitPriceXof}
                minOrderQty={product.minOrderQty}
                storageType={product.storageType}
                isFragile={product.isFragile}
                imageUrl={product.imageUrl}
                volumeTiers={product.volumeTiers}
                compact
              />
            ) : (
              <span className="block rounded-lg bg-surface-subtle py-2 text-center text-xs font-medium text-slate-500">
                Actuellement indisponible
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
