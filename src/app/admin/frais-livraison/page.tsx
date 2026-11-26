import type { Metadata } from "next";
import { DeliveryFeesManager } from "@/components/admin/delivery-fees-manager";
import { getPlatformDeliveryRules } from "@/modules/catalog/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frais de livraison Dakar",
};

export default async function AdminDeliveryFeesPage() {
  const rules = await getPlatformDeliveryRules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Frais de livraison Dakar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Paramétrez votre tarif de base, les suppléments froid/fragile et le seuil de livraison
          offerte.
        </p>
      </div>
      <DeliveryFeesManager initialRules={rules} />
    </div>
  );
}
