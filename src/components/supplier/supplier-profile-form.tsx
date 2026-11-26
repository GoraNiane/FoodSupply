"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { SupplierActivityType } from "@prisma/client";
import { Alert, Button, Card, FormField, Input, Select, Textarea, useToast } from "@/components/ui";

export function SupplierProfileForm({
  initial,
}: {
  initial: {
    companyName: string;
    activityType: SupplierActivityType;
    contactPhone: string;
    pickupNeighborhood: string;
    pickupAddress: string;
    pickupLandmark: string | null;
    description: string | null;
    ninea: string | null;
    rcNumber: string | null;
  };
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = React.useState({
    companyName: initial.companyName,
    activityType: initial.activityType,
    contactPhone: initial.contactPhone,
    pickupNeighborhood: initial.pickupNeighborhood,
    pickupAddress: initial.pickupAddress,
    pickupLandmark: initial.pickupLandmark ?? "",
    description: initial.description ?? "",
    ninea: initial.ninea ?? "",
    rcNumber: initial.rcNumber ?? "",
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/supplier/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de mettre à jour votre profil.");
        return;
      }
      notify({ type: "success", title: "Profil fournisseur mis à jour" });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="max-w-3xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Raison sociale / Nom commercial" htmlFor="pf-company" required>
            <Input
              id="pf-company"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Type d'activité" htmlFor="pf-act" required>
            <Select
              id="pf-act"
              value={form.activityType}
              onChange={(e) =>
                setForm({ ...form, activityType: e.target.value as SupplierActivityType })
              }
            >
              <option value="PRODUCTEUR">Producteur</option>
              <option value="ELEVEUR">Éleveur / Aviculture</option>
              <option value="PECHEUR">Pêche / Mareyage</option>
              <option value="GROSSISTE">Grossiste</option>
              <option value="IMPORTATEUR">Importateur</option>
              <option value="TRANSFORMATEUR">Transformateur</option>
              <option value="EMBALLAGES">Emballages</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Téléphone" htmlFor="pf-phone" required>
            <Input
              id="pf-phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Quartier / Zone" htmlFor="pf-zone" required>
            <Input
              id="pf-zone"
              value={form.pickupNeighborhood}
              onChange={(e) => setForm({ ...form, pickupNeighborhood: e.target.value })}
              required
            />
          </FormField>
        </div>

        <FormField label="Adresse de l'entrepôt / point de collecte" htmlFor="pf-addr" required>
          <Input
            id="pf-addr"
            value={form.pickupAddress}
            onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
            required
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="NINEA (optionnel)" htmlFor="pf-ninea">
            <Input
              id="pf-ninea"
              value={form.ninea}
              onChange={(e) => setForm({ ...form, ninea: e.target.value })}
            />
          </FormField>
          <FormField label="Registre de Commerce (optionnel)" htmlFor="pf-rc">
            <Input
              id="pf-rc"
              value={form.rcNumber}
              onChange={(e) => setForm({ ...form, rcNumber: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Description de votre activité" htmlFor="pf-desc" required>
          <Textarea
            id="pf-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </FormField>

        <Button type="submit" isLoading={isSaving}>
          <Save className="h-4 w-4" />
          Enregistrer mon profil
        </Button>
      </form>
    </Card>
  );
}
