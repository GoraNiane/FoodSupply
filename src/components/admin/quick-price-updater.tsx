"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Zap } from "lucide-react";
import type { AvailabilityStatus } from "@prisma/client";
import {
  Alert,
  Button,
  Card,
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

export interface QuickUpdateProductItem {
  id: string;
  name: string;
  unitLabel: string;
  categoryName: string;
  clientUnitPriceXof: number;
  availability: AvailabilityStatus;
  stockQty: number | null;
  isActive: boolean;
}

export function QuickPriceUpdater({ products }: { products: QuickUpdateProductItem[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState(() =>
    products.map((p) => ({
      productId: p.id,
      name: p.name,
      unitLabel: p.unitLabel,
      categoryName: p.categoryName,
      clientUnitPriceXof: p.clientUnitPriceXof,
      availability: p.availability,
      stockQty: p.stockQty !== null ? String(p.stockQty) : "",
      isActive: p.isActive,
      dirty: false,
    }))
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(
      products.map((p) => ({
        productId: p.id,
        name: p.name,
        unitLabel: p.unitLabel,
        categoryName: p.categoryName,
        clientUnitPriceXof: p.clientUnitPriceXof,
        availability: p.availability,
        stockQty: p.stockQty !== null ? String(p.stockQty) : "",
        isActive: p.isActive,
        dirty: false,
      }))
    );
  }, [products]);

  const dirtyRows = rows.filter((r) => r.dirty);

  async function handleSaveAll() {
    if (dirtyRows.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/products/bulk-quick-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: dirtyRows.map((r) => ({
            productId: r.productId,
            clientUnitPriceXof: Math.max(1, Math.round(Number(r.clientUnitPriceXof) || 1)),
            availability: r.availability,
            stockQty: r.stockQty.trim() === "" ? null : Math.max(0, Math.round(Number(r.stockQty))),
            isActive: r.isActive,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la mise à jour rapide.");
        return;
      }
      notify({
        type: "success",
        title: `${data.updatedCount} produit(s) mis à jour !`,
        description: "Les nouveaux prix du matin sont en ligne sur le catalogue public.",
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  if (products.length === 0) return null;

  return (
    <Card className="border-brand-200 bg-brand-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy-900">
              Mise à jour rapide des prix du matin (Marché Dakar)
            </p>
            <p className="text-xs text-slate-600">
              Modifiez plusieurs prix clients, stocks et disponibilités en tableau sans ouvrir
              chaque fiche produit.
            </p>
          </div>
        </div>
        <Button type="button" variant={open ? "outline" : "navy"} size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Fermer le tableau rapide" : `Ouvrir la mise à jour rapide (${products.length})`}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {error && <Alert variant="danger">{error}</Alert>}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell>Prix client (FCFA)</TableHeaderCell>
                  <TableHeaderCell>Disponibilité</TableHeaderCell>
                  <TableHeaderCell>Stock indicatif</TableHeaderCell>
                  <TableHeaderCell>Publié</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.productId} className={row.dirty ? "bg-brand-50/50" : undefined}>
                    <TableCell>
                      <p className="font-semibold text-navy-900">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.categoryName} • {row.unitLabel}
                      </p>
                    </TableCell>
                    <TableCell className="w-40">
                      <Input
                        type="number"
                        min={1}
                        step={50}
                        value={row.clientUnitPriceXof}
                        onChange={(e) => {
                          const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, clientUnitPriceXof: val, dirty: true } : r
                            )
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-44">
                      <Select
                        value={row.availability}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    availability: e.target.value as AvailabilityStatus,
                                    dirty: true,
                                  }
                                : r
                            )
                          )
                        }
                      >
                        <option value="IN_STOCK">En stock</option>
                        <option value="ON_CONFIRMATION">Sur confirmation</option>
                        <option value="OUT_OF_STOCK">Rupture</option>
                      </Select>
                    </TableCell>
                    <TableCell className="w-28">
                      <Input
                        type="number"
                        min={0}
                        value={row.stockQty}
                        placeholder="—"
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, stockQty: e.target.value, dirty: true } : r
                            )
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, isActive: e.target.checked, dirty: true } : r
                            )
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {dirtyRows.length} produit(s) modifié(s) en attente d&apos;enregistrement.
            </p>
            <Button
              type="button"
              variant="success"
              disabled={dirtyRows.length === 0}
              isLoading={isSaving}
              onClick={handleSaveAll}
            >
              <Save className="h-4 w-4" />
              Enregistrer les {dirtyRows.length} modification(s)
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
