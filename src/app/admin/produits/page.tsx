import type { Metadata } from "next";
import { ProductsManager } from "@/components/admin/products-manager";
import { QuickPriceUpdater } from "@/components/admin/quick-price-updater";
import {
  getPlatformDefaultMargin,
  listAdminCategories,
  listAdminProducts,
} from "@/modules/catalog/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produits & Stocks",
};

export default async function AdminProductsPage() {
  let products: Awaited<ReturnType<typeof listAdminProducts>> = [];
  let categories: Awaited<ReturnType<typeof listAdminCategories>> = [];
  const defaultMargin = await getPlatformDefaultMargin();

  try {
    [products, categories] = await Promise.all([listAdminProducts(), listAdminCategories()]);
  } catch {
    // DB non initialisée
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Produits, Prix & Stocks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gérez directement vos produits en tant que vendeur unique : coût d&apos;achat, marge brute,
          prix client FCFA, stocks et disponibilité.
        </p>
      </div>
      <QuickPriceUpdater
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unitLabel: p.unitLabel,
          categoryName: p.categoryName,
          clientUnitPriceXof: p.clientUnitPriceXof,
          availability: p.availability,
          stockQty: p.stockQty,
          isActive: p.isActive,
        }))}
      />
      <ProductsManager
        initialProducts={products}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          marginType: c.marginType,
          marginValue: c.marginValue,
        }))}
        defaultMargin={defaultMargin}
      />
    </div>
  );
}
