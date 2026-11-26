import type { Metadata } from "next";
import { MarginsManager } from "@/components/admin/margins-manager";
import {
  getPlatformDefaultMargin,
  listAdminCategories,
} from "@/modules/catalog/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marges commerciales",
};

export default async function AdminMarginsPage() {
  const defaultMargin = await getPlatformDefaultMargin();
  let categories: Awaited<ReturnType<typeof listAdminCategories>> = [];
  try {
    categories = await listAdminCategories();
  } catch {
    categories = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Marges commerciales</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configurez votre marge par défaut et visualisez l&apos;impact immédiat sur vos prix clients
          en FCFA.
        </p>
      </div>
      <MarginsManager initialDefaultMargin={defaultMargin} categories={categories} />
    </div>
  );
}
