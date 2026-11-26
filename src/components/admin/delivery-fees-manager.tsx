"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Save, Truck } from "lucide-react";
import { Alert, Button, Card, FormField, Input, useToast } from "@/components/ui";
import {
  computeDeliveryFeeXof,
  DEFAULT_DAKAR_ZONES,
  type DeliveryFeeRules,
  type DeliveryZoneFee,
} from "@/modules/deliveries/fee-calculator";
import { formatXof } from "@/lib/utils/format";

export function DeliveryFeesManager({ initialRules }: { initialRules: DeliveryFeeRules }) {
  const router = useRouter();
  const { notify } = useToast();

  const [baseFeeXof, setBaseFeeXof] = React.useState(String(initialRules.baseFeeXof));
  const [coldChainSurchargeXof, setColdChainSurchargeXof] = React.useState(
    String(initialRules.coldChainSurchargeXof)
  );
  const [fragileSurchargeXof, setFragileSurchargeXof] = React.useState(
    String(initialRules.fragileSurchargeXof)
  );
  const [freeDeliveryThresholdXof, setFreeDeliveryThresholdXof] = React.useState(
    String(initialRules.freeDeliveryThresholdXof)
  );
  const [zones, setZones] = React.useState<DeliveryZoneFee[]>(
    initialRules.zoneFees && initialRules.zoneFees.length > 0
      ? initialRules.zoneFees
      : DEFAULT_DAKAR_ZONES
  );

  // Simulateur
  const [simSubtotal, setSimSubtotal] = React.useState("45000");
  const [simNeighborhood, setSimNeighborhood] = React.useState("Almadies");
  const [simCold, setSimCold] = React.useState(true);
  const [simFragile, setSimFragile] = React.useState(true);

  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentRules: DeliveryFeeRules = {
    baseFeeXof: Math.max(0, Math.round(Number(baseFeeXof || 0))),
    extraSupplierPickupFeeXof: 0,
    coldChainSurchargeXof: Math.max(0, Math.round(Number(coldChainSurchargeXof || 0))),
    fragileSurchargeXof: Math.max(0, Math.round(Number(fragileSurchargeXof || 0))),
    freeDeliveryThresholdXof: Math.max(0, Math.round(Number(freeDeliveryThresholdXof || 0))),
    zoneFees: zones,
  };

  const sim = computeDeliveryFeeXof({
    subtotalClientXof: Math.max(0, Math.round(Number(simSubtotal || 0))),
    requiresColdChain: simCold,
    hasFragileItems: simFragile,
    neighborhood: simNeighborhood,
    rules: currentRules,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/settings/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentRules),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer les frais.");
        return;
      }
      notify({
        type: "success",
        title: "Grille zones Dakar enregistrée",
        description: `Tarif hors-zone : ${formatXof(currentRules.baseFeeXof)}`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="p-6 lg:col-span-7">
        <h2 className="text-base font-bold text-navy-900">
          Tarification par zones de Dakar & suppléments
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Le tarif s&apos;adapte automatiquement au quartier saisi par le client dans le panier. Si
          un quartier n&apos;est dans aucune zone, le tarif par défaut s&apos;applique.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* ZONES DAKAR */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700">
              <MapPin className="h-4 w-4" />
              Zones géographiques Dakar
            </div>
            {zones.map((zone, idx) => (
              <div
                key={zone.id}
                className="rounded-xl border border-surface-border bg-surface-muted/50 p-3.5 space-y-2"
              >
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-8">
                    <label className="mb-1 block text-xs font-semibold text-navy-900">
                      Nom de la zone
                    </label>
                    <Input
                      value={zone.label}
                      onChange={(e) =>
                        setZones((prev) =>
                          prev.map((z, i) => (i === idx ? { ...z, label: e.target.value } : z))
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-navy-900">
                      Tarif (FCFA)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={250}
                      value={zone.feeXof}
                      onChange={(e) => {
                        const val = Math.max(0, Math.round(Number(e.target.value || 0)));
                        setZones((prev) =>
                          prev.map((z, i) => (i === idx ? { ...z, feeXof: val } : z))
                        );
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Quartiers couverts (séparés par virgule)
                  </label>
                  <Input
                    value={zone.neighborhoods.join(", ")}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setZones((prev) =>
                        prev.map((z, i) => (i === idx ? { ...z, neighborhoods: list } : z))
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Tarif par défaut (quartier hors zone, FCFA)"
              htmlFor="fee-base"
              required
            >
              <Input
                id="fee-base"
                type="number"
                min={0}
                step={250}
                value={baseFeeXof}
                onChange={(e) => setBaseFeeXof(e.target.value)}
                required
              />
            </FormField>

            <FormField
              label="Seuil livraison gratuite (FCFA)"
              htmlFor="fee-free"
              hint="Mettre 0 pour désactiver la gratuité."
            >
              <Input
                id="fee-free"
                type="number"
                min={0}
                step={5000}
                value={freeDeliveryThresholdXof}
                onChange={(e) => setFreeDeliveryThresholdXof(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Supplément chaîne du froid (FCFA)"
              htmlFor="fee-cold"
              hint="Appliqué si la commande contient du frais ou surgelé."
            >
              <Input
                id="fee-cold"
                type="number"
                min={0}
                step={250}
                value={coldChainSurchargeXof}
                onChange={(e) => setColdChainSurchargeXof(e.target.value)}
              />
            </FormField>

            <FormField
              label="Supplément produits fragiles (FCFA)"
              htmlFor="fee-fragile"
              hint="Appliqué si la commande contient des œufs ou articles fragiles."
            >
              <Input
                id="fee-fragile"
                type="number"
                min={0}
                step={250}
                value={fragileSurchargeXof}
                onChange={(e) => setFragileSurchargeXof(e.target.value)}
              />
            </FormField>
          </div>

          <Button type="submit" isLoading={isSaving}>
            <Save className="h-4 w-4" />
            Enregistrer les tarifs par zones Dakar
          </Button>
        </form>
      </Card>

      <Card className="bg-navy-900 p-6 text-white lg:col-span-5">
        <div className="flex items-center gap-2 text-brand-400">
          <Truck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Simulateur frais client</span>
        </div>
        <h2 className="mt-2 text-lg font-bold">Tester un panier Dakar</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="sim-neigh" className="mb-1.5 block text-xs text-navy-200">
              Quartier à Dakar
            </label>
            <Input
              id="sim-neigh"
              value={simNeighborhood}
              onChange={(e) => setSimNeighborhood(e.target.value)}
              placeholder="Ex. Plateau, Almadies, Parcelles Assainies, Rufisque..."
              className="border-navy-700 bg-navy-800 text-white"
            />
          </div>

          <div>
            <label htmlFor="sim-sub" className="mb-1.5 block text-xs text-navy-200">
              Sous-total panier client (FCFA)
            </label>
            <Input
              id="sim-sub"
              type="number"
              min={0}
              step={5000}
              value={simSubtotal}
              onChange={(e) => setSimSubtotal(e.target.value)}
              className="border-navy-700 bg-navy-800 text-white"
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={simCold}
                onChange={(e) => setSimCold(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Contient des produits frais / surgelés
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={simFragile}
                onChange={(e) => setSimFragile(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Contient des produits fragiles (œufs)
            </label>
          </div>

          <div className="space-y-1.5 rounded-xl bg-navy-800 p-4 text-xs">
            <div className="flex justify-between text-navy-200">
              <span>Zone détectée</span>
              <span className="font-semibold text-white">
                {sim.matchedZoneLabel ?? "Tarif standard Dakar"}
              </span>
            </div>
            <div className="flex justify-between text-navy-200">
              <span>Tarif zone</span>
              <span>{formatXof(sim.baseFeeXof)}</span>
            </div>
            <div className="flex justify-between text-navy-200">
              <span>Supplément froid</span>
              <span>{formatXof(sim.coldChainFeeXof)}</span>
            </div>
            <div className="flex justify-between text-navy-200">
              <span>Supplément fragile</span>
              <span>{formatXof(sim.fragileFeeXof)}</span>
            </div>
            <div className="flex justify-between border-t border-navy-700 pt-2 text-base font-bold text-brand-400">
              <span>Frais facturés</span>
              <span>
                {sim.freeDeliveryApplied ? "OFFERT (0 FCFA)" : formatXof(sim.totalDeliveryFeeXof)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
