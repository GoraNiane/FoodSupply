import type { Metadata } from "next";
import { getCompanyProfile, getPaymentConfig } from "@/modules/payments/settings";
import { AdminSettingsManager } from "@/components/admin/admin-settings-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paramètres FoodSupply",
};

export default async function AdminSettingsPage() {
  const [paymentConfig, companyProfile] = await Promise.all([
    getPaymentConfig(),
    getCompanyProfile(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Paramètres généraux & Wave</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configurez votre lien marchand Wave Sénégal et vos informations légales pour les factures
          PDF clients.
        </p>
      </div>

      <AdminSettingsManager
        initialPaymentConfig={paymentConfig}
        initialCompanyProfile={companyProfile}
      />
    </div>
  );
}
