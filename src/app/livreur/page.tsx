import { CheckCircle2, Truck, Wallet } from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { requirePageRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const user = await requirePageRole(["DRIVER"], "/connexion-admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Espace Livreur — {user.fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consultez vos tournées assignées par FoodSupply et confirmez vos livraisons à Dakar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Missions actives" value={0} icon={<Truck className="h-5 w-5" />} accent="brand" />
        <StatCard title="Livraisons terminées" value={0} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard title="Rémunérations à percevoir" value="0 FCFA" icon={<Wallet className="h-5 w-5" />} accent="navy" />
      </div>

      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Votre compte livreur est authentifié et protégé. La gestion complète des collectes et
          preuves de livraison sera déployée en Phase 9.
        </p>
      </Card>
    </div>
  );
}
