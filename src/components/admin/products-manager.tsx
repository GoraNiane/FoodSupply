"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Snowflake,
  Trash2,
  X,
} from "lucide-react";
import type { AvailabilityStatus, MarginType, StorageType } from "@prisma/client";
import {
  Alert,
  AvailabilityBadge,
  Badge,
  Button,
  Card,
  ConfirmDialog,
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
  Textarea,
  useToast,
} from "@/components/ui";
import { resolveOfferPricing, type VolumePriceTier } from "@/modules/catalog/pricing";
import { formatXof } from "@/lib/utils/format";

export interface AdminProductRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryMarginType: MarginType | null;
  categoryMarginValue: number | null;
  name: string;
  sku: string;
  unitLabel: string;
  description: string | null;
  imageUrl: string | null;
  origin: string | null;
  storageType: StorageType;
  isFragile: boolean;
  isActive: boolean;
  supplierPriceXof: number;
  clientUnitPriceXof: number;
  marginUnitAmountXof: number;
  marginTypeOverride: MarginType | null;
  marginValueOverride: number | null;
  minOrderQty: number;
  stockQty: number | null;
  availability: AvailabilityStatus;
  leadTimeHours: number;
  volumeTiers?: VolumePriceTier[];
}

export interface CategoryOption {
  id: string;
  name: string;
  marginType: MarginType | null;
  marginValue: number | null;
}

type PricingMode = "DIRECT_PRICE" | "AUTO_MARGIN" | "PERCENTAGE" | "FIXED_XOF";

export function ProductsManager({
  initialProducts,
  categories,
  defaultMargin,
}: {
  initialProducts: AdminProductRow[];
  categories: CategoryOption[];
  defaultMargin: { marginType: MarginType; marginValue: number };
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminProductRow | null>(null);

  // Form states
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [unitLabel, setUnitLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [origin, setOrigin] = React.useState("Sénégal");
  const [storageType, setStorageType] = React.useState<StorageType>("AMBIENT");
  const [isFragile, setIsFragile] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  // Tarification vendeur unique : prix de vente direct OU coût + marge
  const [pricingMode, setPricingMode] = React.useState<PricingMode>("DIRECT_PRICE");
  const [directClientPriceXof, setDirectClientPriceXof] = React.useState("2500");
  const [supplierPriceXof, setSupplierPriceXof] = React.useState("1800");
  const [marginOverrideInput, setMarginOverrideInput] = React.useState("");

  const [minOrderQty, setMinOrderQty] = React.useState("1");
  const [stockQty, setStockQty] = React.useState("50");
  const [availability, setAvailability] = React.useState<AvailabilityStatus>("IN_STOCK");
  const [leadTimeHours, setLeadTimeHours] = React.useState("12");
  const [volumeTiers, setVolumeTiers] = React.useState<Array<{ minQty: string; unitPriceXof: string }>>([]);

  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProductRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const selectedCat = categories.find((c) => c.id === categoryId);
  const costNum = Math.max(0, Math.round(Number(supplierPriceXof || 0)));
  const directPriceNum = Math.max(0, Math.round(Number(directClientPriceXof || 0)));

  const computedPreview = React.useMemo(() => {
    if (pricingMode === "DIRECT_PRICE") {
      const margin = Math.max(0, directPriceNum - costNum);
      return {
        clientUnitPriceXof: directPriceNum,
        marginUnitAmountXof: margin,
      };
    }
    return resolveOfferPricing(costNum, {
      offerMarginType:
        pricingMode === "AUTO_MARGIN" ? null : pricingMode,
      offerMarginValue:
        pricingMode === "AUTO_MARGIN"
          ? null
          : pricingMode === "PERCENTAGE"
            ? Math.round(Number(marginOverrideInput || 0) * 100)
            : Math.round(Number(marginOverrideInput || 0)),
      categoryMarginType: selectedCat?.marginType ?? null,
      categoryMarginValue: selectedCat?.marginValue ?? null,
      defaultMarginType: defaultMargin.marginType,
      defaultMarginValue: defaultMargin.marginValue,
    });
  }, [pricingMode, directPriceNum, costNum, marginOverrideInput, selectedCat, defaultMargin]);

  function openCreate() {
    setEditing(null);
    setCategoryId(categories[0]?.id ?? "");
    setName("");
    setSku(`FS-${Date.now().toString(36).toUpperCase().slice(-5)}`);
    setUnitLabel("");
    setDescription("");
    setImageUrl("");
    setOrigin("Sénégal");
    setStorageType("AMBIENT");
    setIsFragile(false);
    setIsActive(true);
    setPricingMode("DIRECT_PRICE");
    setDirectClientPriceXof("2500");
    setSupplierPriceXof("1800");
    setMarginOverrideInput("");
    setMinOrderQty("1");
    setStockQty("50");
    setAvailability("IN_STOCK");
    setLeadTimeHours("12");
    setVolumeTiers([]);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: AdminProductRow) {
    setEditing(row);
    setCategoryId(row.categoryId);
    setName(row.name);
    setSku(row.sku);
    setUnitLabel(row.unitLabel);
    setDescription(row.description ?? "");
    setImageUrl(row.imageUrl ?? "");
    setOrigin(row.origin ?? "Sénégal");
    setStorageType(row.storageType);
    setIsFragile(row.isFragile);
    setIsActive(row.isActive);
    setSupplierPriceXof(String(row.supplierPriceXof));
    setDirectClientPriceXof(String(row.clientUnitPriceXof));
    setPricingMode("DIRECT_PRICE");
    setMarginOverrideInput("");
    setMinOrderQty(String(row.minOrderQty));
    setStockQty(row.stockQty != null ? String(row.stockQty) : "");
    setAvailability(row.availability);
    setLeadTimeHours(String(row.leadTimeHours));
    setVolumeTiers(
      (row.volumeTiers ?? []).map((t) => ({
        minQty: String(t.minQty),
        unitPriceXof: String(t.unitPriceXof),
      }))
    );
    setFormError(null);
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/admin/uploads/product-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Impossible de téléverser la photo.");
        return;
      }
      setImageUrl(data.imageUrl);
      notify({
        type: "success",
        title: "Photo ajoutée",
        description: "La photo produit est prête à être publiée.",
      });
    } catch {
      setFormError("Erreur réseau lors de l'envoi de la photo.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (pricingMode === "DIRECT_PRICE" && directPriceNum < 50) {
      setFormError("Veuillez saisir un prix de vente client valide (minimum 50 FCFA).");
      return;
    }

    setIsSaving(true);

    let effectiveCostXof = costNum;
    let marginTypeOverride: MarginType | null = null;
    let marginValueOverride: number | null = null;

    if (pricingMode === "DIRECT_PRICE") {
      // Si le coût d'achat saisi dépasse le prix de vente, on le ramène au prix de vente
      effectiveCostXof = Math.min(costNum, directPriceNum);
      marginTypeOverride = "FIXED_XOF";
      marginValueOverride = directPriceNum - effectiveCostXof;
    } else if (pricingMode === "PERCENTAGE") {
      marginTypeOverride = "PERCENTAGE";
      marginValueOverride = Math.round(Number(marginOverrideInput || 0) * 100);
    } else if (pricingMode === "FIXED_XOF") {
      marginTypeOverride = "FIXED_XOF";
      marginValueOverride = Math.round(Number(marginOverrideInput || 0));
    }

    const payload = {
      categoryId,
      name,
      sku,
      unitLabel,
      description: description || null,
      imageUrl: imageUrl || null,
      origin,
      storageType,
      isFragile,
      isActive,
      supplierPriceXof: effectiveCostXof,
      minOrderQty: Math.max(1, Math.round(Number(minOrderQty || 1))),
      stockQty: stockQty.trim() === "" ? null : Math.max(0, Math.round(Number(stockQty))),
      availability,
      leadTimeHours: Math.max(1, Math.round(Number(leadTimeHours || 12))),
      marginTypeOverride,
      marginValueOverride,
      volumeTiers: volumeTiers
        .map((t) => ({
          minQty: Math.round(Number(t.minQty) || 0),
          unitPriceXof: Math.round(Number(t.unitPriceXof) || 0),
        }))
        .filter((t) => t.minQty >= 2 && t.unitPriceXof > 0),
    };

    try {
      const url = editing ? `/api/v1/admin/products/${editing.id}` : "/api/v1/admin/products";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Impossible d'enregistrer le produit.");
        return;
      }

      notify({
        type: "success",
        title: editing ? "Article mis à jour" : "Article publié dans votre catalogue",
        description: `${name} — ${formatXof(computedPreview.clientUnitPriceXof)}`,
      });
      setShowForm(false);
      router.refresh();
    } catch {
      setFormError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ type: "error", title: "Erreur", description: data.error });
      } else {
        notify({
          type: "success",
          title: data.archived ? "Produit archivé" : "Produit supprimé",
          description: data.message ?? deleteTarget.name,
        });
        router.refresh();
      }
    } catch {
      notify({ type: "error", title: "Erreur réseau" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const filtered = initialProducts.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !filterCategory || p.categoryId === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article ou SKU..."
              className="pl-9"
            />
          </div>
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-48"
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Button type="button" onClick={openCreate} disabled={categories.length === 0}>
          <Plus className="h-4 w-4" />
          Ajouter mon article
        </Button>
      </div>

      {categories.length === 0 && (
        <Alert variant="warning" title="Aucune catégorie disponible">
          Créez d&apos;abord au moins une catégorie dans l&apos;onglet Catégories avant d&apos;ajouter
          vos articles.
        </Alert>
      )}

      {showForm && (
        <Card className="border-brand-300 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy-900">
                {editing ? `Modifier : ${editing.name}` : "Publier un nouvel article"}
              </h2>
              <p className="text-xs text-slate-500">
                Importez votre photo, fixez directement votre prix de vente en FCFA et publiez
                immédiatement dans votre boutique.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Fermer
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && <Alert variant="danger">{formError}</Alert>}

            {/* PHOTO PRODUIT (UPLOAD DIRECT + APERÇU) */}
            <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-900">
                Photo de l&apos;article (JPG, PNG, WEBP — max 5 Mo)
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {imageUrl ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-surface-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Aperçu" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute right-1 top-1 rounded-full bg-ink-900/80 p-1 text-white hover:bg-danger-600"
                      aria-label="Supprimer la photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-surface-border bg-white text-brand-500">
                    <ImagePlus className="h-7 w-7" />
                    <span className="mt-1 text-[10px] font-medium">Aucune photo</span>
                  </div>
                )}

                <div className="flex-1 space-y-2.5 min-w-[220px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600">
                    <ImagePlus className="h-4 w-4" />
                    {isUploadingImage ? "Envoi en cours..." : "Choisir une photo depuis mon appareil"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Ou collez une URL d'image (https://...)"
                    aria-label="URL de l'image produit"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Catégorie" htmlFor="prod-cat" required>
                <Select
                  id="prod-cat"
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

              <FormField label="Nom de l'article" htmlFor="prod-name" required>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Œufs frais plateau de 30"
                  required
                />
              </FormField>

              <FormField label="Référence SKU" htmlFor="prod-sku" required>
                <Input
                  id="prod-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex. FS-OEUF-001"
                  required
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Conditionnement / Unité de vente" htmlFor="prod-unit" required>
                <Input
                  id="prod-unit"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="Ex. Plateau de 30, Carton 10 kg, Bidon 20 L"
                  required
                />
              </FormField>

              <FormField label="Origine" htmlFor="prod-origin">
                <Input
                  id="prod-origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Sénégal"
                />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="prod-desc">
              <Textarea
                id="prod-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qualité, calibre, détails utiles pour les restaurants..."
              />
            </FormField>

            {/* TARIFICATION DIRECTE OU PAR MARGE */}
            <div className="rounded-xl border border-surface-border bg-surface-muted p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-navy-900">
                  Tarification & Marge (FCFA)
                </p>
                <Select
                  value={pricingMode}
                  onChange={(e) => setPricingMode(e.target.value as PricingMode)}
                  className="w-64"
                  aria-label="Mode de tarification"
                >
                  <option value="DIRECT_PRICE">Fixer directement le prix client (FCFA)</option>
                  <option value="AUTO_MARGIN">Calculer via marge catégorie / défaut</option>
                  <option value="PERCENTAGE">Coût d&apos;achat + pourcentage (%)</option>
                  <option value="FIXED_XOF">Coût d&apos;achat + marge fixe (FCFA)</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {pricingMode === "DIRECT_PRICE" && (
                  <FormField label="Prix de vente client (FCFA)" htmlFor="prod-direct-price" required>
                    <Input
                      id="prod-direct-price"
                      type="number"
                      min={50}
                      step={50}
                      value={directClientPriceXof}
                      onChange={(e) => setDirectClientPriceXof(e.target.value)}
                      required
                    />
                  </FormField>
                )}

                <FormField
                  label={
                    pricingMode === "DIRECT_PRICE"
                      ? "Votre coût d'achat interne (FCFA, optionnel)"
                      : "Votre coût d'achat (FCFA)"
                  }
                  htmlFor="prod-cost"
                  required={pricingMode !== "DIRECT_PRICE"}
                >
                  <Input
                    id="prod-cost"
                    type="number"
                    min={0}
                    step={50}
                    value={supplierPriceXof}
                    onChange={(e) => setSupplierPriceXof(e.target.value)}
                    required={pricingMode !== "DIRECT_PRICE"}
                  />
                </FormField>

                {(pricingMode === "PERCENTAGE" || pricingMode === "FIXED_XOF") && (
                  <FormField
                    label={pricingMode === "PERCENTAGE" ? "Taux de marge (%)" : "Marge fixe (FCFA)"}
                    htmlFor="prod-margin-val"
                    required
                  >
                    <Input
                      id="prod-margin-val"
                      type="number"
                      min={0}
                      step={pricingMode === "PERCENTAGE" ? "0.5" : "50"}
                      value={marginOverrideInput}
                      onChange={(e) => setMarginOverrideInput(e.target.value)}
                      required
                    />
                  </FormField>
                )}

                <div className="flex flex-col justify-center rounded-xl border border-brand-200 bg-white px-4 py-2.5">
                  <span className="text-[11px] font-medium text-slate-500">Prix affiché aux clients</span>
                  <span className="text-lg font-extrabold text-brand-600">
                    {formatXof(computedPreview.clientUnitPriceXof)}
                  </span>
                  <span className="text-[11px] font-semibold text-success-600">
                    Votre marge brute : +{formatXof(computedPreview.marginUnitAmountXof)}
                  </span>
                </div>
              </div>
            </div>

            {/* LOGISTIQUE & STOCKS */}
            <div className="grid gap-4 md:grid-cols-5">
              <FormField label="Disponibilité" htmlFor="prod-avail">
                <Select
                  id="prod-avail"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                >
                  <option value="IN_STOCK">En stock</option>
                  <option value="ON_CONFIRMATION">Sur confirmation</option>
                  <option value="OUT_OF_STOCK">Rupture</option>
                </Select>
              </FormField>

              <FormField label="Stock indicatif" htmlFor="prod-stock">
                <Input
                  id="prod-stock"
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
              </FormField>

              <FormField label="Qté min. commande" htmlFor="prod-minqty">
                <Input
                  id="prod-minqty"
                  type="number"
                  min={1}
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(e.target.value)}
                />
              </FormField>

              <FormField label="Conservation" htmlFor="prod-storage">
                <Select
                  id="prod-storage"
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value as StorageType)}
                >
                  <option value="AMBIENT">Ambiant</option>
                  <option value="CHILLED">Frais (0–4 °C)</option>
                  <option value="FROZEN">Surgelé (-18 °C)</option>
                </Select>
              </FormField>

              <FormField label="Délai (heures)" htmlFor="prod-lead">
                <Input
                  id="prod-lead"
                  type="number"
                  min={1}
                  max={168}
                  value={leadTimeHours}
                  onChange={(e) => setLeadTimeHours(e.target.value)}
                />
              </FormField>
            </div>

            {/* PALIERS DE PRIX DÉGRESSIFS PAR VOLUME (GROS / DEMI-GROS) */}
            <div className="space-y-2.5 rounded-xl border border-surface-border bg-surface-muted/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    Tarifs dégressifs par volume (optionnel — Gros & Demi-gros)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ex. à partir de 5 unités → 3 050 FCFA, à partir de 20 unités → 2 900 FCFA.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={volumeTiers.length >= 6}
                  onClick={() =>
                    setVolumeTiers((prev) => [...prev, { minQty: "5", unitPriceXof: "" }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un palier
                </Button>
              </div>

              {volumeTiers.length > 0 && (
                <div className="space-y-2">
                  {volumeTiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-600">À partir de</span>
                      <Input
                        type="number"
                        min={2}
                        className="h-9 w-24"
                        value={tier.minQty}
                        onChange={(e) =>
                          setVolumeTiers((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, minQty: e.target.value } : t))
                          )
                        }
                        placeholder="5"
                      />
                      <span className="text-xs text-slate-600">unités →</span>
                      <Input
                        type="number"
                        min={1}
                        step={50}
                        className="h-9 w-36"
                        value={tier.unitPriceXof}
                        onChange={(e) =>
                          setVolumeTiers((prev) =>
                            prev.map((t, i) =>
                              i === idx ? { ...t, unitPriceXof: e.target.value } : t
                            )
                          )
                        }
                        placeholder="Prix FCFA"
                      />
                      <span className="text-xs text-slate-600">FCFA / u.</span>
                      <button
                        type="button"
                        onClick={() =>
                          setVolumeTiers((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                        aria-label="Supprimer ce palier"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-navy-900">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-500"
                />
                Article fragile (ex. œufs)
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-navy-900">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-500"
                />
                Visible dans le catalogue public
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-surface-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {editing ? "Enregistrer les modifications" : "Publier mon article"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TABLEAU ARTICLES */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Article</TableHeaderCell>
              <TableHeaderCell>Catégorie</TableHeaderCell>
              <TableHeaderCell>Coût d&apos;achat</TableHeaderCell>
              <TableHeaderCell>Marge brute</TableHeaderCell>
              <TableHeaderCell>Prix client</TableHeaderCell>
              <TableHeaderCell>Stock & Dispo</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.imageUrl}
                        alt={row.name}
                        className="h-11 w-11 rounded-lg border border-surface-border object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-navy-900">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.sku} • {row.unitLabel}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {row.storageType !== "AMBIENT" && (
                          <Badge variant="info">
                            <Snowflake className="h-3 w-3" />
                            {row.storageType === "FROZEN" ? "Surgelé" : "Frais"}
                          </Badge>
                        )}
                        {row.isFragile && (
                          <Badge variant="warning">
                            <ShieldAlert className="h-3 w-3" />
                            Fragile
                          </Badge>
                        )}
                        {!row.isActive && <Badge variant="neutral">Masqué</Badge>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell className="text-slate-600">{formatXof(row.supplierPriceXof)}</TableCell>
                <TableCell className="font-semibold text-success-600">
                  +{formatXof(row.marginUnitAmountXof)}
                </TableCell>
                <TableCell className="font-bold text-brand-600">
                  {formatXof(row.clientUnitPriceXof)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <AvailabilityBadge status={row.availability} />
                    <p className="text-xs text-slate-500">
                      Stock : {row.stockQty ?? "—"} • Min. {row.minOrderQty}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(row)}
                      aria-label={`Modifier ${row.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`Supprimer ${row.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                  Aucun article pour le moment. Cliquez sur « Ajouter mon article » pour publier
                  votre premier produit avec sa photo et son prix FCFA.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer ou archiver cet article ?"
        description={`Voulez-vous supprimer « ${deleteTarget?.name ?? ""} » ? S'il existe déjà dans des commandes passées, il sera automatiquement archivé sans altérer l'historique comptable.`}
        confirmLabel="Confirmer"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
