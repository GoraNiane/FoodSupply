import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { listAdminCategories } from "@/modules/catalog/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestion des catégories",
};

export default async function AdminCategoriesPage() {
  let categories: Awaited<ReturnType<typeof listAdminCategories>> = [];
  try {
    categories = await listAdminCategories();
  } catch {
    categories = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Catégories du catalogue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Créez vos rayons alimentaires et définissez des marges commerciales par catégorie.
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
