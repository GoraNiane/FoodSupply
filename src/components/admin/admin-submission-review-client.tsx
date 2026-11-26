"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Eye, MessageCircle, Phone, Ban, XCircle } from "lucide-react";
import type { SupplierSubmissionStatus } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  SubmissionStatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export interface AdminSubmissionDetailView {
  id: string;
  title: string;
  description: string | null;
  unitLabel: string;
  categoryName: string;
  origin: string | null;
  supplyPriceXof: number;
  negotiatedPriceXof: number | null;
  availableQty: number;
  minOrderQty: number;
  status: SupplierSubmissionStatus;
  adminReviewNote: string | null;
  publishedProductId: string | null;
  createdAt: string;
  supplier: {
    companyName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    pickupNeighborhood: string;
    pickupAddress: string;
  };
  images: Array<{
    id: string;
    url: string;
    isSelectedForCatalog: boolean;
  }>;
}

export function AdminSubmissionReviewClient({
  submission,
}: {
  submission: AdminSubmissionDetailView;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const initialCost = submission.negotiatedPriceXof ?? submission.supplyPriceXof;
  const [negotiatedPriceXof, setNegotiatedPriceXof] = React.useState(String(initialCost));
  const [publicTitle, setPublicTitle] = React.useState(submission.title);
  const [publicUnitLabel, setPublicUnitLabel] = React.useState(submission.unitLabel);
  const [publicDescription, setPublicDescription] = React.useState(submission.description ?? "");
  const [publicClientPriceXof, setPublicClientPriceXof] = React.useState(
    String(Math.round(initialCost * 1.2))
  );
  const [adminReviewNote, setAdminReviewNote] = React.useState(submission.adminReviewNote ?? "");
  const [selectedImageIds, setSelectedImageIds] = React.useState<string[]>(() => {
    const pre = submission.images.filter((i) => i.isSelectedForCatalog).map((i) => i.id);
    if (pre.length > 0) return pre;
    return submission.images[0] ? [submission.images[0].id] : [];
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const costNum = Math.max(0, Math.round(Number(negotiatedPriceXof || 0)));
  const clientPriceNum = Math.max(0, Math.round(Number(publicClientPriceXof || 0)));
  const marginXof = clientPriceNum - costNum;

  function toggleImage(id: string) {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submitReview(status: SupplierSubmissionStatus, publishToCatalog: boolean) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/admin/submissions/${submission.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          negotiatedPriceXof: costNum,
          adminReviewNote: adminReviewNote || null,
          publishToCatalog,
          publicTitle,
          publicUnitLabel,
          publicDescription,
          publicClientPriceXof: clientPriceNum,
          selectedImageIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer votre décision.");
        return;
      }

      notify({
        type: "success",
        title: publishToCatalog
          ? "Approuvé & publié au catalogue FoodSupply !"
          : `Statut mis à jour : ${status}`,
        description: publishToCatalog
          ? `Visible aux clients sous la marque FoodSupply à ${formatXof(clientPriceNum)}.`
          : undefined,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsLoading(false);
    }
  }

  const wa = submission.supplier.contactPhone.replace(/[^\d]/g, "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900">{submission.title}</h1>
            <SubmissionStatusBadge status={submission.status} />
            {submission.publishedProductId && <Badge variant="success">Publié au catalogue</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Soumis le {formatDateDakar(submission.createdAt, true)} • Catégorie :{" "}
            {submission.categoryName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${submission.supplier.contactPhone}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink-900 hover:bg-surface-muted"
          >
            <Phone className="h-3.5 w-3.5 text-brand-600" />
            Appeler fournisseur
          </a>
          {wa.length >= 8 && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Négocier sur WhatsApp
            </a>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* DONNÉES CONFIDENTIELLES FOURNISSEUR + PHOTOS ORIGINALES */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="p-6 space-y-3 text-sm">
            <Badge variant="navy">Confidentiel — Invisible aux clients</Badge>
            <h2 className="text-base font-bold text-ink-900">{submission.supplier.companyName}</h2>
            <p className="text-slate-600">
              Responsable : <strong>{submission.supplier.contactName}</strong>
            </p>
            <p className="text-slate-600">
              Téléphone : <strong>{submission.supplier.contactPhone}</strong> •{" "}
              {submission.supplier.contactEmail}
            </p>
            <p className="text-slate-600">
              Entrepôt : {submission.supplier.pickupAddress}, {submission.supplier.pickupNeighborhood}
            </p>

            <div className="grid grid-cols-2 gap-3 border-t border-surface-border pt-3">
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-[11px] text-slate-500">Prix proposé fournisseur</p>
                <p className="mt-0.5 text-base font-bold text-ink-900">
                  {formatXof(submission.supplyPriceXof)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-[11px] text-slate-500">Quantité disponible</p>
                <p className="mt-0.5 text-base font-bold text-ink-900">
                  {submission.availableQty} ({submission.unitLabel})
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <h2 className="text-base font-bold text-ink-900">
              Photos originales envoyées ({submission.images.length})
            </h2>
            <p className="text-xs text-slate-500">
              Cochez les photos que vous souhaitez promouvoir dans le catalogue public FoodSupply.
            </p>
            {submission.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {submission.images.map((img) => {
                  const selected = selectedImageIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggleImage(img.id)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                        selected ? "border-brand-600 ring-2 ring-brand-500/30" : "border-surface-border"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="Photo originale" className="h-full w-full object-cover" />
                      <span
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                          selected ? "bg-brand-600" : "bg-ink-900/50"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aucune photo jointe par le fournisseur.</p>
            )}
          </Card>
        </div>

        {/* NÉGOCIATION & PUBLICATION CATALOGUE FOODSUPPLY */}
        <Card className="p-6 space-y-5 lg:col-span-7">
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              Négociation & Publication sous la marque FoodSupply
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Le client ne verra que le titre commercial, la description, les photos choisies et le
              prix public FoodSupply ci-dessous.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Prix d'achat négocié (FCFA)" htmlFor="rev-cost" required>
              <Input
                id="rev-cost"
                type="number"
                min={0}
                step={50}
                value={negotiatedPriceXof}
                onChange={(e) => setNegotiatedPriceXof(e.target.value)}
              />
            </FormField>

            <FormField label="Prix de vente public FoodSupply (FCFA)" htmlFor="rev-client" required>
              <Input
                id="rev-client"
                type="number"
                min={50}
                step={50}
                value={publicClientPriceXof}
                onChange={(e) => setPublicClientPriceXof(e.target.value)}
              />
            </FormField>

            <div className="flex flex-col justify-center rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5">
              <span className="text-[11px] font-medium text-slate-500">Marge brute FoodSupply</span>
              <span
                className={`text-lg font-extrabold ${marginXof >= 0 ? "text-success-600" : "text-danger-600"}`}
              >
                {marginXof >= 0 ? `+${formatXof(marginXof)}` : formatXof(marginXof)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Titre commercial public FoodSupply" htmlFor="rev-title" required>
              <Input
                id="rev-title"
                value={publicTitle}
                onChange={(e) => setPublicTitle(e.target.value)}
              />
            </FormField>

            <FormField label="Unité affichée au client" htmlFor="rev-unit" required>
              <Input
                id="rev-unit"
                value={publicUnitLabel}
                onChange={(e) => setPublicUnitLabel(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Description commerciale publique" htmlFor="rev-desc">
            <Textarea
              id="rev-desc"
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
            />
          </FormField>

          <FormField
            label="Note d'examen / motif (visible par le fournisseur dans son espace)"
            htmlFor="rev-note"
          >
            <Input
              id="rev-note"
              value={adminReviewNote}
              onChange={(e) => setAdminReviewNote(e.target.value)}
              placeholder="Ex. Tarif validé après négociation, produit retenu pour le catalogue."
            />
          </FormField>

          <div className="flex flex-wrap gap-2.5 border-t border-surface-border pt-4">
            <Button
              type="button"
              variant="primary"
              isLoading={isLoading}
              onClick={() => submitReview("APPROUVE", true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approuver & Publier au catalogue
            </Button>

            <Button
              type="button"
              variant="navy"
              isLoading={isLoading}
              onClick={() => submitReview("EN_COURS_EXAMEN", false)}
            >
              <Eye className="h-4 w-4" />
              Mettre en examen
            </Button>

            <Button
              type="button"
              variant="outline"
              isLoading={isLoading}
              onClick={() => submitReview("SUSPENDU", false)}
            >
              <Ban className="h-4 w-4" />
              Suspendre
            </Button>

            <Button
              type="button"
              variant="danger"
              isLoading={isLoading}
              onClick={() => submitReview("REFUSE", false)}
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
