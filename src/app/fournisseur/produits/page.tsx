import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
import { SupplierSubmissionsManager } from "@/components/supplier/supplier-submissions-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes propositions produits",
};

export default async function SupplierProductsPage() {
  const user = await requirePageRole(["SUPPLIER"], "/connexion-fournisseur");

  const [supplier, categories, submissions] = await Promise.all([
    user.supplierId
      ? prisma.supplier.findUnique({ where: { id: user.supplierId } })
      : null,
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    user.supplierId
      ? prisma.supplierProductSubmission.findMany({
          where: { supplierId: user.supplierId },
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { name: true } },
            images: { orderBy: { displayOrder: "asc" }, select: { id: true, url: true } },
          },
        })
      : [],
  ]);

  return (
    <SupplierSubmissionsManager
      categories={categories}
      isSuspended={!supplier || supplier.verificationStatus === "SUSPENDED" || !supplier.isActive}
      initialSubmissions={submissions.map((s) => ({
        id: s.id,
        title: s.title,
        categoryName: s.category.name,
        unitLabel: s.unitLabel,
        supplyPriceXof: s.supplyPriceXof,
        negotiatedPriceXof: s.negotiatedPriceXof,
        availableQty: s.availableQty,
        isAvailable: s.isAvailable,
        status: s.status,
        adminReviewNote: s.adminReviewNote,
        createdAt: s.createdAt.toISOString(),
        images: s.images,
      }))}
    />
  );
}
