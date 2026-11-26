"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, Ban } from "lucide-react";
import type { SupplierActivityType, VerificationStatus } from "@prisma/client";
import {
  Badge,
  Button,
  ConfirmDialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  VerificationStatusBadge,
  useToast,
} from "@/components/ui";
import { formatDateDakar } from "@/lib/utils/format";

export interface AdminSupplierRow {
  id: string;
  companyName: string;
  activityType: SupplierActivityType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pickupNeighborhood: string;
  pickupAddress: string;
  description: string | null;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  submissionsCount: number;
  createdAt: string;
}

export function AdminSuppliersClient({ suppliers }: { suppliers: AdminSupplierRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = React.useState<AdminSupplierRow | null>(null);

  async function updateStatus(id: string, verificationStatus: VerificationStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (!res.ok) {
        notify({ type: "error", title: "Mise à jour impossible" });
        return;
      }
      notify({
        type: "success",
        title:
          verificationStatus === "APPROVED"
            ? "Fournisseur approuvé"
            : verificationStatus === "SUSPENDED"
              ? "Fournisseur suspendu"
              : "Statut mis à jour",
      });
      setSuspendTarget(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Entreprise & Activité</TableHeaderCell>
              <TableHeaderCell>Responsable & Contact (Confidentiel)</TableHeaderCell>
              <TableHeaderCell>Localisation</TableHeaderCell>
              <TableHeaderCell>Propositions</TableHeaderCell>
              <TableHeaderCell>Statut</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((s) => {
              const wa = s.contactPhone.replace(/[^\d]/g, "");
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-bold text-ink-900">{s.companyName}</p>
                    <Badge variant="navy" className="mt-1">
                      {s.activityType}
                    </Badge>
                    {s.description && (
                      <p className="mt-1 max-w-xs line-clamp-2 text-xs text-slate-500">
                        {s.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-ink-900">{s.contactName}</p>
                    <p className="text-xs text-slate-500">{s.contactEmail}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <a
                        href={`tel:${s.contactPhone}`}
                        className="inline-flex items-center gap-1 rounded bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink-900 hover:bg-brand-50"
                      >
                        <Phone className="h-3 w-3 text-brand-600" />
                        {s.contactPhone}
                      </a>
                      {wa.length >= 8 && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700 hover:bg-success-100"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-ink-900">{s.pickupNeighborhood}</p>
                    <p className="text-xs text-slate-500">{s.pickupAddress}</p>
                    <p className="text-[11px] text-slate-400">
                      Inscrit le {formatDateDakar(s.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="font-bold">{s.submissionsCount}</TableCell>
                  <TableCell>
                    <VerificationStatusBadge status={s.verificationStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      {s.verificationStatus !== "APPROVED" && (
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          isLoading={busyId === s.id}
                          onClick={() => updateStatus(s.id, "APPROVED")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approuver
                        </Button>
                      )}
                      {s.verificationStatus !== "SUSPENDED" && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busyId === s.id}
                          onClick={() => setSuspendTarget(s)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Suspendre
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                  Aucun fournisseur inscrit pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title="Suspendre ce fournisseur ?"
        description={`Suspendre « ${suspendTarget?.companyName ?? ""} » désactivera immédiatement ses offres d'approvisionnement en coulisses et l'empêchera de soumettre de nouveaux produits.`}
        confirmLabel="Oui, suspendre"
        isLoading={Boolean(busyId)}
        onConfirm={() => suspendTarget && updateStatus(suspendTarget.id, "SUSPENDED")}
        onCancel={() => setSuspendTarget(null)}
      />
    </>
  );
}
