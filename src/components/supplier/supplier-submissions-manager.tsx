"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, PackagePlus, Trash2, X } from "lucide-react";
import type { StorageType, SupplierSubmissionStatus } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  SubmissionStatusBadge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

interface UploadedSubImage {
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SupplierSubmissionRow {
  id: string;
  title: string;
  categoryName: string;
  unitLabel: string;
  supplyPriceXof: number;
  negotiatedPriceXof: number | null;
  availableQty: number;
  isAvailable: boolean;
  status: SupplierSubmissionStatus;
  adminReviewNote: string | null;
  createdAt: string;
  images: Array<{ id: string; url: string }>;
}

export function SupplierSubmissionsManager({
  initialSubmissions,
  categories,
  isSuspended,
}: {
  initialSubmissions: SupplierSubmissionRow[];
  categories: Array<{ id: string; name: string }>;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [showForm, setShowForm] = React.useState(initialSubmissions.length === 0);
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [unitLabel, setUnitLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [origin, setOrigin] = React.useState("Sénégal");
  const [storageType, setStorageType] = React.useState<StorageType>("AMBIENT");
  const [isFragile, setIsFragile] = React.useState(false);
  const [supplyPriceXof, setSupplyPriceXof] = React.useState("");
  const [availableQty, setAvailableQty] = React.useState("50");
  const [minOrderQty, setMinOrderQty] = React.useState("1");
  const [images, setImages] = React.useState<UploadedSubImage[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 6 - images.length);
    const toUpload = files.slice(0, remainingSlots);
    setIsUploading(true);
    setError(null);

    try {
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/v1/supplier/uploads/submission-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Impossible de téléverser une photo.");
          continue;
        }
        setImages((prev) => [
          ...prev,
          {
            storageKey: data.storageKey,
            url: data.url,
            mimeType: data.mimeType,
            sizeBytes: data.sizeBytes,
          },
        ]);
      }
    } catch {
      setError("Erreur réseau lors de l'envoi des photos.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/supplier/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title,
          unitLabel,
          description,
          origin,
          storageType,
          isFragile,
          supplyPriceXof: Math.round(Number(supplyPriceXof || 0)),
          availableQty: Math.round(Number(availableQty || 0)),
          minOrderQty: Math.max(1, Math.round(Number(minOrderQty || 1))),
          isAvailable: true,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de soumettre ce produit.");
        return;
      }

      notify({
        type: "success",
        title: "Produit soumis à FoodSupply",
        description: "Votre proposition est maintenant en attente de validation par l'administration.",
      });
      setTitle("");
      setUnitLabel("");
      setDescription("");
      setSupplyPriceXof("");
      setAvailableQty("50");
      setImages([]);
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleAvailability(row: SupplierSubmissionRow) {
    try {
      const res = await fetch(`/api/v1/supplier/submissions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !row.isAvailable }),
      });
      if (res.ok) {
        notify({
          type: "success",
          title: row.isAvailable ? "Marqué indisponible" : "Marqué disponible",
        });
        router.refresh();
      }
    } catch {
      notify({ type: "error", title: "Erreur réseau" });
    }
  }

  async function removePending(row: SupplierSubmissionRow) {
    try {
      const res = await fetch(`/api/v1/supplier/submissions/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ type: "error", title: "Impossible", description: data.error });
        return;
      }
      notify({ type: "success", title: "Proposition retirée" });
      router.refresh();
    } catch {
      notify({ type: "error", title: "Erreur réseau" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Mes propositions de produits</h1>
          <p className="mt-1 text-sm text-slate-600">
            Proposez vos produits avec photos et prix d&apos;approvisionnement. FoodSupply examine
            chaque soumission avant toute mise en vente.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          disabled={isSuspended || categories.length === 0}
        >
          <PackagePlus className="h-4 w-4" />
          {showForm ? "Fermer le formulaire" : "Soumettre un nouveau produit"}
        </Button>
      </div>

      {showForm && !isSuspended && (
        <Card className="border-brand-300 p-6">
          <h2 className="text-lg font-bold text-ink-900">Soumettre un produit à FoodSupply</h2>
          <p className="mt-1 text-xs text-slate-500">
            Votre produit sera enregistré au statut <strong>En attente de validation</strong> et ne
            sera jamais visible publiquement tant qu&apos;un administrateur ne l&apos;a pas approuvé.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {error && <Alert variant="danger">{error}</Alert>}

            {/* UPLOAD MULTI-PHOTOS */}
            <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  Photos du produit (jusqu&apos;à 6 photos — JPG, PNG, WEBP, 5 Mo max)
                </p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800">
                    <ImagePlus className="h-4 w-4" />
                    Prendre une photo (Caméra)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handleFilesChange}
                      disabled={isUploading || images.length >= 6}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                    <ImagePlus className="h-4 w-4" />
                    {isUploading ? "Téléversement..." : "Galerie photos"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFilesChange}
                      disabled={isUploading || images.length >= 6}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((img) => (
                    <div
                      key={img.storageKey}
                      className="relative h-24 w-24 overflow-hidden rounded-xl border border-surface-border bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="Photo soumise" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setImages((prev) => prev.filter((i) => i.storageKey !== img.storageKey))
                        }
                        className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-1 text-white hover:bg-danger-600"
                        aria-label="Retirer cette photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Catégorie" htmlFor="sub-cat" required>
                <Select
                  id="sub-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Nom du produit" htmlFor="sub-title" required>
                <Input
                  id="sub-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex. Œufs frais calibre L"
                  required
                />
              </FormField>

              <FormField label="Unité de vente" htmlFor="sub-unit" required>
                <Input
                  id="sub-unit"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="Ex. Plateau de 30, Carton 10 kg, Sac 25 kg"
                  required
                />
              </FormField>
            </div>

            <FormField label="Description de la marchandise" htmlFor="sub-desc" required>
              <Textarea
                id="sub-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qualité, calibre, provenance, fraîcheur, conditionnement..."
                required
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-4">
              <FormField
                label="Prix d'approvisionnement (FCFA)"
                htmlFor="sub-price"
                required
                hint="Strictement confidentiel (vu uniquement par FoodSupply)."
              >
                <Input
                  id="sub-price"
                  type="number"
                  min={50}
                  step={50}
                  value={supplyPriceXof}
                  onChange={(e) => setSupplyPriceXof(e.target.value)}
                  placeholder="Ex. 1800"
                  required
                />
              </FormField>

              <FormField label="Quantité disponible" htmlFor="sub-qty" required>
                <Input
                  id="sub-qty"
                  type="number"
                  min={0}
                  value={availableQty}
                  onChange={(e) => setAvailableQty(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Qté minimum" htmlFor="sub-min">
                <Input
                  id="sub-min"
                  type="number"
                  min={1}
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(e.target.value)}
                />
              </FormField>

              <FormField label="Conservation" htmlFor="sub-storage">
                <Select
                  id="sub-storage"
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value as StorageType)}
                >
                  <option value="AMBIENT">Ambiant</option>
                  <option value="CHILLED">Frais (0–4 °C)</option>
                  <option value="FROZEN">Surgelé (-18 °C)</option>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Origine" htmlFor="sub-origin">
                <Input id="sub-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
              </FormField>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-900">
                  <input
                    type="checkbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Marchandise fragile (ex. œufs)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-surface-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Soumettre à FoodSupply
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TABLEAU DES SOUMISSIONS */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Produit proposé</TableHeaderCell>
              <TableHeaderCell>Prix proposé</TableHeaderCell>
              <TableHeaderCell>Stock & Dispo</TableHeaderCell>
              <TableHeaderCell>Statut FoodSupply</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {initialSubmissions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {row.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.images[0].url}
                        alt={row.title}
                        className="h-12 w-12 rounded-lg border border-surface-border object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                        {row.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-ink-900">{row.title}</p>
                      <p className="text-xs text-slate-500">
                        {row.categoryName} • {row.unitLabel} • {row.images.length} photo(s)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Soumis le {formatDateDakar(row.createdAt, true)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-bold text-ink-900">{formatXof(row.supplyPriceXof)}</p>
                  {row.negotiatedPriceXof && row.negotiatedPriceXof !== row.supplyPriceXof && (
                    <p className="text-xs font-medium text-brand-600">
                      Négocié : {formatXof(row.negotiatedPriceXof)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{row.availableQty} unités</p>
                  <Badge variant={row.isAvailable ? "success" : "neutral"}>
                    {row.isAvailable ? "Disponible" : "Indisponible"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <SubmissionStatusBadge status={row.status} />
                  {row.adminReviewNote && (
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{row.adminReviewNote}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAvailability(row)}
                    >
                      {row.isAvailable ? "Pause" : "Activer"}
                    </Button>
                    {row.status !== "APPROUVE" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => removePending(row)}
                        aria-label="Retirer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {initialSubmissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  Vous n&apos;avez pas encore soumis de produit à FoodSupply.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
