import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
import { SupplierProfileForm } from "@/components/supplier/supplier-profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil fournisseur",
};

export default async function SupplierProfilePage() {
  const user = await requirePageRole(["SUPPLIER"], "/connexion-fournisseur");
  if (!user.supplierId) notFound();

  const supplier = await prisma.supplier.findUnique({ where: { id: user.supplierId } });
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Profil de mon entreprise</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ces informations sont strictement confidentielles et accessibles uniquement à l&apos;équipe
          FoodSupply.
        </p>
      </div>
      <SupplierProfileForm initial={supplier} />
    </div>
  );
}
