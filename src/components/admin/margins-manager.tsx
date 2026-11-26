"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, Save } from "lucide-react";
import type { MarginType } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@/components/ui";
import { computeClientPriceXof, formatXof } from "@/lib/utils/format";

export function MarginsManager({
  initialDefaultMargin,
  categories,
}: {
  initialDefaultMargin: { marginType: MarginType; marginValue: number };
  categories: Array<{
    id: string;
    name: string;
    marginType: MarginType | null;
    marginValue: number | null;
    productCount: number;
  }>;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [marginType, setMarginType] = React.useState<MarginType>(initialDefaultMargin.marginType);
  const [inputValue, setInputValue] = React.useState(
    initialDefaultMargin.marginType === "PERCENTAGE"
      ? String(initialDefaultMargin.marginValue / 100)
      : String(initialDefaultMargin.marginValue)
  );
  const [simCost, setSimCost] = React.useState("10000");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const normalizedValue =
    marginType === "PERCENTAGE"
      ? Math.round(Number(inputValue || 0) * 100)
      : Math.round(Number(inputValue || 0));

  const simulation = computeClientPriceXof({
    supplierPriceXof: Number(simCost || 0),
    marginType,
    marginValue: normalizedValue,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/settings/margins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginType, marginValue: normalizedValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer.");
        return;
      }
      notify({
        type: "success",
        title: "Marge par défaut mise à jour",
        description: "Les nouveaux prix clients reflètent immédiatement cette règle.",
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-6">
          <h2 className="text-base font-bold text-navy-900">Marge par défaut FoodSupply</h2>
          <p className="mt-1 text-xs text-slate-500">
            Appliquée à tous les produits sans règle spécifique au niveau du produit ou de la
            catégorie. Hiérarchie : Offre produit &gt; Catégorie &gt; Défaut plateforme.
          </p>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <FormField label="Type de marge globale" htmlFor="def-margin-type">
              <Select
                id="def-margin-type"
                value={marginType}
                onChange={(e) => setMarginType(e.target.value as MarginType)}
              >
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED_XOF">Montant fixe (FCFA)</option>
              </Select>
            </FormField>

            <FormField
              label={marginType === "PERCENTAGE" ? "Taux de marge (%)" : "Montant fixe (FCFA)"}
              htmlFor="def-margin-val"
              required
            >
              <Input
                id="def-margin-val"
                type="number"
                min={0}
                step={marginType === "PERCENTAGE" ? "0.5" : "50"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                required
              />
            </FormField>

            <Button type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4" />
              Enregistrer la marge globale
            </Button>
          </form>
        </Card>

        <Card className="bg-navy-900 p-6 text-white lg:col-span-6">
          <div className="flex items-center gap-2 text-brand-400">
            <Calculator className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Simulateur en direct</span>
          </div>
          <h2 className="mt-2 text-lg font-bold">Prévisualiser le prix client FCFA</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="sim-cost" className="mb-1.5 block text-xs text-navy-200">
                Coût d&apos;achat unitaire (FCFA)
              </label>
              <Input
                id="sim-cost"
                type="number"
                min={0}
                step={100}
                value={simCost}
                onChange={(e) => setSimCost(e.target.value)}
                className="border-navy-700 bg-navy-800 text-white placeholder:text-navy-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-navy-800 p-4">
                <p className="text-xs text-navy-200">Marge brute</p>
                <p className="mt-1 text-xl font-bold text-success-500">
                  +{formatXof(simulation.marginUnitAmountXof)}
                </p>
              </div>
              <div className="rounded-xl bg-navy-800 p-4">
                <p className="text-xs text-navy-200">Prix client affiché</p>
                <p className="mt-1 text-xl font-bold text-brand-400">
                  {formatXof(simulation.clientUnitPriceXof)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h3 className="text-base font-bold text-navy-900">Marges configurées par catégorie</h3>
          <Link href="/admin/categories" className="text-xs font-semibold text-brand-600 hover:underline">
            Modifier dans Catégories →
          </Link>
        </div>
        <TableContainer className="border-0 shadow-none">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Catégorie</TableHeaderCell>
                <TableHeaderCell>Produits</TableHeaderCell>
                <TableHeaderCell>Règle active</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-semibold">{cat.name}</TableCell>
                  <TableCell>{cat.productCount}</TableCell>
                  <TableCell>
                    {cat.marginType && cat.marginValue != null ? (
                      <Badge variant="brand">
                        {cat.marginType === "FIXED_XOF"
                          ? `+${formatXof(cat.marginValue)}`
                          : `+${(cat.marginValue / 100).toFixed(2).replace(/\.00$/, "")} %`}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Hérite du défaut plateforme</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </div>
  );
}
