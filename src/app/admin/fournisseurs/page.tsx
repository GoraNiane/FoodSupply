import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { AdminSuppliersClient } from "@/components/admin/admin-suppliers-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fournisseurs inscrits (Confidentiel)",
};

export default async function AdminSuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true } },
      _count: { select: { productSubmissions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Fournisseurs partenaires (Coulisses)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ces comptes et coordonnées sont strictement confidentiels et invisibles aux clients
          FoodSupply.
        </p>
      </div>

      <AdminSuppliersClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          companyName: s.companyName,
          activityType: s.activityType,
          contactName: s.user.fullName,
          contactEmail: s.user.email,
          contactPhone: s.contactPhone,
          pickupNeighborhood: s.pickupNeighborhood,
          pickupAddress: s.pickupAddress,
          description: s.description,
          verificationStatus: s.verificationStatus,
          isActive: s.isActive,
          submissionsCount: s._count.productSubmissions,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
