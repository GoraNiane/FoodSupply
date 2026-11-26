import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { AdminSubmissionReviewClient } from "@/components/admin/admin-submission-review-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Examen proposition fournisseur",
};

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sub = await prisma.supplierProductSubmission.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      supplier: {
        include: { user: { select: { fullName: true, email: true } } },
      },
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!sub) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/propositions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux propositions
      </Link>

      <AdminSubmissionReviewClient
        submission={{
          id: sub.id,
          title: sub.title,
          description: sub.description,
          unitLabel: sub.unitLabel,
          categoryName: sub.category.name,
          origin: sub.origin,
          supplyPriceXof: sub.supplyPriceXof,
          negotiatedPriceXof: sub.negotiatedPriceXof,
          availableQty: sub.availableQty,
          minOrderQty: sub.minOrderQty,
          status: sub.status,
          adminReviewNote: sub.adminReviewNote,
          publishedProductId: sub.publishedProductId,
          createdAt: sub.createdAt.toISOString(),
          supplier: {
            companyName: sub.supplier.companyName,
            contactName: sub.supplier.user.fullName,
            contactPhone: sub.supplier.contactPhone,
            contactEmail: sub.supplier.user.email,
            pickupNeighborhood: sub.supplier.pickupNeighborhood,
            pickupAddress: sub.supplier.pickupAddress,
          },
          images: sub.images.map((img) => ({
            id: img.id,
            url: img.url,
            isSelectedForCatalog: img.isSelectedForCatalog,
          })),
        }}
      />
    </div>
  );
}
