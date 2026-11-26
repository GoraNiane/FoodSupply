"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { MarginType } from "@prisma/client";
import {
  Alert,
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
  useToast,
} from "@/components/ui";
import { formatXof } from "@/lib/utils/format";

export interface AdminCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  marginType: MarginType | null;
  marginValue: number | null;
  productCount: number;
}

function formatMarginLabel(type: MarginType | null, value: number | null) {
  if (!type || value == null) return "Défaut plateforme";
  if (type === "FIXED_XOF") return `+${formatXof(value)}`;
  return `+${(value / 100).toFixed(2).replace(/\.00$/, "")} %`;
}

export function CategoriesManager({
  initialCategories,
}: {
  initialCategories: AdminCategoryItem[];
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [editing, setEditing] = React.useState<AdminCategoryItem | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [displayOrder, setDisplayOrder] = React.useState("0");
  const [marginMode, setMarginMode] = React.useState<"DEFAULT" | "PERCENTAGE" | "FIXED_XOF">(
    "DEFAULT"
  );
  const [marginInput, setMarginInput] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
    setDisplayOrder("0");
    setMarginMode("DEFAULT");
    setMarginInput("");
    setIsActive(true);
    setError(null);
  }

  function startEdit(cat: AdminCategoryItem) {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? "");
    setDisplayOrder(String(cat.displayOrder));
    if (!cat.marginType || cat.marginValue == null) {
      setMarginMode("DEFAULT");
      setMarginInput("");
    } else if (cat.marginType === "PERCENTAGE") {
      setMarginMode("PERCENTAGE");
      setMarginInput(String(cat.marginValue / 100));
    } else {
      setMarginMode("FIXED_XOF");
      setMarginInput(String(cat.marginValue));
    }
    setIsActive(cat.isActive);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const parsedMarginValue =
      marginMode === "DEFAULT"
        ? null
        : marginMode === "PERCENTAGE"
          ? Math.round(Number(marginInput || "0") * 100)
          : Math.round(Number(marginInput || "0"));

    const payload = {
      name,
      description: description || null,
      displayOrder: Number(displayOrder || "0"),
      isActive,
      marginType: marginMode === "DEFAULT" ? null : marginMode,
      marginValue: parsedMarginValue,
    };

    try {
      const url = editing
        ? `/api/v1/admin/categories/${editing.id}`
        : "/api/v1/admin/categories";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement.");
        return;
      }

      notify({
        type: "success",
        title: editing ? "Catégorie mise à jour" : "Catégorie créée",
        description: name,
      });
      resetForm();
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ type: "error", title: "Suppression impossible", description: data.error });
      } else {
        notify({ type: "success", title: "Catégorie supprimée", description: deleteTarget.name });
        router.refresh();
      }
    } catch {
      notify({ type: "error", title: "Erreur réseau" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="h-fit p-6 lg:col-span-4">
        <h2 className="text-base font-bold text-navy-900">
          {editing ? `Modifier : ${editing.name}` : "Nouvelle catégorie"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Organisez votre catalogue et définissez une marge commerciale spécifique par rayon.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormField label="Nom de la catégorie" htmlFor="cat-name" required>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Œufs, Volailles, Huiles..."
              required
            />
          </FormField>

          <FormField label="Description (optionnel)" htmlFor="cat-desc">
            <Input
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ordre d'affichage" htmlFor="cat-order">
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </FormField>
            <FormField label="Statut" htmlFor="cat-active">
              <Select
                id="cat-active"
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
              >
                <option value="true">Active</option>
                <option value="false">Masquée</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Règle de marge catégorie" htmlFor="cat-margin-mode">
            <Select
              id="cat-margin-mode"
              value={marginMode}
              onChange={(e) =>
                setMarginMode(e.target.value as "DEFAULT" | "PERCENTAGE" | "FIXED_XOF")
              }
            >
              <option value="DEFAULT">Marge par défaut plateforme</option>
              <option value="PERCENTAGE">Pourcentage (%)</option>
              <option value="FIXED_XOF">Montant fixe (FCFA)</option>
            </Select>
          </FormField>

          {marginMode !== "DEFAULT" && (
            <FormField
              label={marginMode === "PERCENTAGE" ? "Taux de marge (%)" : "Marge fixe (FCFA)"}
              htmlFor="cat-margin-val"
              required
            >
              <Input
                id="cat-margin-val"
                type="number"
                min={0}
                step={marginMode === "PERCENTAGE" ? "0.5" : "50"}
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                placeholder={marginMode === "PERCENTAGE" ? "Ex. 15" : "Ex. 700"}
                required
              />
            </FormField>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSaving} className="flex-1">
              <Plus className="h-4 w-4" />
              {editing ? "Enregistrer" : "Créer"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="lg:col-span-8">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Catégorie</TableHeaderCell>
                <TableHeaderCell>Marge appliquée</TableHeaderCell>
                <TableHeaderCell>Produits</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {initialCategories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{cat.name}</p>
                    <p className="text-xs text-slate-500">/{cat.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cat.marginType ? "brand" : "neutral"}>
                      {formatMarginLabel(cat.marginType, cat.marginValue)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{cat.productCount}</TableCell>
                  <TableCell>
                    <Badge variant={cat.isActive ? "success" : "neutral"} dot>
                      {cat.isActive ? "Active" : "Masquée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(cat)}
                        aria-label={`Modifier ${cat.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                        onClick={() => setDeleteTarget(cat)}
                        aria-label={`Supprimer ${cat.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {initialCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                    Aucune catégorie créée pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer cette catégorie ?"
        description={`Voulez-vous vraiment supprimer « ${deleteTarget?.name ?? ""} » ? Cette action est impossible si des produits y sont encore rattachés.`}
        confirmLabel="Supprimer"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
