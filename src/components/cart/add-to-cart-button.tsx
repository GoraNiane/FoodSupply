"use client";

import * as React from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import type { StorageType } from "@prisma/client";
import { Button, useToast } from "@/components/ui";
import { useCart } from "./cart-context";
import {
  resolveVolumeTierUnitPrice,
  type VolumePriceTier,
} from "@/modules/catalog/pricing";
import { formatXof } from "@/lib/utils/format";

export interface AddToCartButtonProps {
  offerId: string;
  slug: string;
  name: string;
  unitLabel: string;
  categoryName: string;
  clientUnitPriceXof: number;
  minOrderQty: number;
  storageType: StorageType;
  isFragile: boolean;
  imageUrl?: string | null;
  volumeTiers?: VolumePriceTier[];
  withQuantitySelector?: boolean;
  compact?: boolean;
}

export function AddToCartButton({
  withQuantitySelector = false,
  compact = false,
  ...product
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const [qty, setQty] = React.useState(product.minOrderQty);
  const [justAdded, setJustAdded] = React.useState(false);

  function handleAdd() {
    addItem(product, withQuantitySelector ? qty : product.minOrderQty);
    setJustAdded(true);
    notify({
      type: "success",
      title: "Ajouté au panier",
      description: `${withQuantitySelector ? qty : product.minOrderQty} × ${product.name}`,
    });
    setTimeout(() => setJustAdded(false), 1200);
  }

  if (withQuantitySelector) {
    const { effectiveUnitPriceXof, appliedTier } = resolveVolumeTierUnitPrice(
      product.clientUnitPriceXof,
      qty,
      product.volumeTiers
    );
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-surface-border bg-white">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(product.minOrderQty, q - 1))}
              className="flex h-11 w-10 items-center justify-center rounded-l-lg text-navy-900 hover:bg-surface-subtle"
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={product.minOrderQty}
              value={qty}
              onChange={(e) =>
                setQty(
                  Math.max(product.minOrderQty, Math.round(Number(e.target.value) || product.minOrderQty))
                )
              }
              aria-label="Quantité"
              className="h-11 w-16 border-x border-surface-border text-center text-sm font-bold text-navy-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-11 w-10 items-center justify-center rounded-r-lg text-navy-900 hover:bg-surface-subtle"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button type="button" size="lg" onClick={handleAdd} className="min-w-[200px] flex-1">
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {justAdded
              ? "Ajouté au panier"
              : `Ajouter (${formatXof(effectiveUnitPriceXof * qty)})`}
          </Button>
        </div>
        {appliedTier && (
          <p className="text-xs font-semibold text-success-700">
            Tarif gros appliqué : {formatXof(effectiveUnitPriceXof)} / unité (dès {appliedTier.minQty} unités)
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={justAdded ? "success" : "primary"}
      size={compact ? "sm" : "md"}
      onClick={handleAdd}
      className="w-full"
    >
      {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {justAdded ? "Ajouté" : "Ajouter au panier"}
    </Button>
  );
}
