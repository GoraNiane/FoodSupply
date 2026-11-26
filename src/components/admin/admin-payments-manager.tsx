"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, RotateCcw, XCircle } from "lucide-react";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export interface AdminPaymentRow {
  id: string;
  reference: string;
  orderId: string;
  orderNumber: string;
  clientLabel: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountXof: number;
  providerTransactionId: string | null;
  clientDeclaredPaid: boolean;
  clientDeclarationRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AwaitingOrderRow {
  id: string;
  orderNumber: string;
  clientLabel: string;
  totalClientXof: number;
  createdAt: string;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  WAVE: "Wave Sénégal",
  ORANGE_MONEY: "Orange Money",
  CARD: "Carte",
  BANK_TRANSFER: "Virement",
  CASH_ON_DELIVERY: "À la livraison",
};

const STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; variant: "warning" | "success" | "danger" | "neutral" | "brand" }
> = {
  INITIATED: { label: "Initié", variant: "neutral" },
  PENDING: { label: "En attente vérif.", variant: "warning" },
  SUCCEEDED: { label: "Encaissé", variant: "success" },
  FAILED: { label: "Échoué", variant: "danger" },
  CANCELLED: { label: "Annulé", variant: "neutral" },
  EXPIRED: { label: "Expiré", variant: "neutral" },
  REFUNDED: { label: "Remboursé", variant: "brand" },
  PARTIALLY_REFUNDED: { label: "Remb. partiel", variant: "brand" },
};

export function AdminPaymentsManager({
  payments,
  awaitingOrdersWithoutPayment,
}: {
  payments: AdminPaymentRow[];
  awaitingOrdersWithoutPayment: AwaitingOrderRow[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [txInputs, setTxInputs] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  async function confirmPayment(params: {
    orderId: string;
    paymentId?: string;
    method?: PaymentMethod;
    key: string;
  }) {
    setBusyId(params.key);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: params.orderId,
          paymentId: params.paymentId,
          method: params.method ?? "WAVE",
          providerTransactionId: txInputs[params.key]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de valider le paiement.");
        return;
      }
      notify({
        type: "success",
        title: "Paiement encaissé !",
        description: `Facture ${data.invoiceNumber} générée automatiquement.`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  async function markFailed(paymentId: string) {
    setBusyId(paymentId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/payments/${paymentId}/fail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Paiement non reçu / non vérifié sur Wave." }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action impossible.");
        return;
      }
      notify({ type: "info", title: "Paiement marqué comme échoué." });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  async function refundPayment(paymentId: string) {
    const reason = window.prompt(
      "Motif du remboursement intégral (enregistré au journal d'audit) :",
      "Annulation / remboursement validé par FoodSupply"
    );
    if (!reason || reason.trim().length < 3) return;

    setBusyId(paymentId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Remboursement impossible.");
        return;
      }
      notify({
        type: "success",
        title: "Remboursement enregistré",
        description: `Référence ${data.reference} (${formatXof(data.amountXof)}).`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="danger">{error}</Alert>}

      {awaitingOrdersWithoutPayment.length > 0 && (
        <Card className="border-brand-300 bg-brand-50/30 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-navy-900">
              Commandes confirmées en attente de règlement Wave ({awaitingOrdersWithoutPayment.length})
            </h2>
            <p className="text-xs text-slate-600">
              Si le client a payé directement via votre lien Wave sans cliquer sur &laquo; J&apos;ai payé &raquo;,
              vous pouvez valider l&apos;encaissement ici en un clic.
            </p>
          </div>
          <div className="space-y-2.5">
            {awaitingOrdersWithoutPayment.map((ord) => (
              <div
                key={ord.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-white p-3.5"
              >
                <div>
                  <Link
                    href={`/admin/commandes/${ord.id}`}
                    className="font-bold text-brand-700 hover:underline"
                  >
                    {ord.orderNumber}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {ord.clientLabel} • {formatDateDakar(ord.createdAt, true)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-navy-900">
                    {formatXof(ord.totalClientXof)}
                  </span>
                  <Input
                    className="h-9 w-40 text-xs"
                    placeholder="Réf. Wave (opt.)"
                    value={txInputs[`ord_${ord.id}`] ?? ""}
                    onChange={(e) =>
                      setTxInputs((prev) => ({ ...prev, [`ord_${ord.id}`]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    isLoading={busyId === `ord_${ord.id}`}
                    onClick={() =>
                      confirmPayment({ orderId: ord.id, method: "WAVE", key: `ord_${ord.id}` })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider Wave reçu
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="Aucun paiement enregistré"
          description="Les règlements Wave et paiements à la livraison apparaîtront ici dès qu'une commande confirmée est réglée."
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Référence</TableHeaderCell>
                <TableHeaderCell>Commande & Client</TableHeaderCell>
                <TableHeaderCell>Mode</TableHeaderCell>
                <TableHeaderCell>Montant</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => {
                const badge = STATUS_BADGE[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-navy-900">{p.reference}</p>
                      {(p.providerTransactionId || p.clientDeclarationRef) && (
                        <p className="text-[11px] text-slate-500">
                          Réf Wave : {p.providerTransactionId || p.clientDeclarationRef}
                        </p>
                      )}
                      {p.clientDeclaredPaid && p.status === "PENDING" && (
                        <Badge variant="brand" className="mt-1">
                          Signalé payé par le client
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/commandes/${p.orderId}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {p.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{p.clientLabel}</p>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {METHOD_LABELS[p.method]}
                    </TableCell>
                    <TableCell className="font-bold text-navy-900">
                      {formatXof(p.amountXof)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateDakar(p.paidAt ?? p.createdAt, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {(p.status === "PENDING" || p.status === "INITIATED") && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="success"
                              isLoading={busyId === p.id}
                              onClick={() =>
                                confirmPayment({
                                  orderId: p.orderId,
                                  paymentId: p.id,
                                  method: p.method,
                                  key: p.id,
                                })
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Valider
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              isLoading={busyId === p.id}
                              onClick={() => markFailed(p.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Échec
                            </Button>
                          </>
                        )}
                        {p.status === "SUCCEEDED" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            isLoading={busyId === p.id}
                            onClick={() => refundPayment(p.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Rembourser
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
