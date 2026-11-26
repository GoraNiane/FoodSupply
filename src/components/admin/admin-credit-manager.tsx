"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, MessageCircle, Save } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
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
import {
  buildCreditReminderMessage,
  buildWhatsAppLink,
} from "@/modules/notifications/whatsapp";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export interface CreditRestaurantRow {
  id: string;
  businessName: string;
  contactPhone: string;
  ownerName: string;
  ownerEmail: string;
  creditEnabled: boolean;
  creditLimitXof: number;
  creditTermDays: number;
  usedCreditXof: number;
}

export interface UnpaidCreditOrderRow {
  id: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string | null;
  totalClientXof: number;
  paymentDueAt: string | null;
  isOverdue: boolean;
  wavePaymentUrl: string | null;
  invoiceNumber: string | null;
}

export function AdminCreditManager({
  restaurants,
  unpaidCreditOrders,
}: {
  restaurants: CreditRestaurantRow[];
  unpaidCreditOrders: UnpaidCreditOrderRow[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [edits, setEdits] = React.useState(() =>
    Object.fromEntries(
      restaurants.map((r) => [
        r.id,
        {
          creditEnabled: r.creditEnabled,
          creditLimitXof: String(r.creditLimitXof),
          creditTermDays: String(r.creditTermDays),
        },
      ])
    )
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function saveRestaurantCredit(restaurantId: string) {
    const state = edits[restaurantId];
    if (!state) return;
    setBusyId(restaurantId);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/credit-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          creditEnabled: state.creditEnabled,
          creditLimitXof: Math.max(0, Math.round(Number(state.creditLimitXof || 0))),
          creditTermDays: Math.max(1, Math.round(Number(state.creditTermDays || 7))),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Mise à jour impossible.");
        return;
      }
      notify({ type: "success", title: "Ligne Crédit Pro mise à jour" });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  async function settleCreditOrder(orderId: string) {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/credit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, method: "WAVE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'encaisser le solde.");
        return;
      }
      notify({
        type: "success",
        title: "Solde Crédit Pro encaissé !",
        description: `Facture ${data.invoiceNumber} marquée PAYÉE.`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && <Alert variant="danger">{error}</Alert>}

      {/* SECTION 1 : ENCOURS & FACTURES IMPAYÉES */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-navy-900">
          Encours Crédit Pro à encaisser ({unpaidCreditOrders.length})
        </h2>

        {unpaidCreditOrders.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">
            Aucun impayé Crédit Pro en cours. Toutes les lignes sont à jour.
          </Card>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Commande / Facture</TableHeaderCell>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Solde dû</TableHeaderCell>
                  <TableHeaderCell>Échéance</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unpaidCreditOrders.map((ord) => {
                  const waUrl = buildWhatsAppLink(
                    ord.clientPhone,
                    buildCreditReminderMessage({
                      clientName: ord.clientName,
                      orderNumber: ord.orderNumber,
                      totalClientXof: ord.totalClientXof,
                      dueAt: ord.paymentDueAt,
                      waveUrl: ord.wavePaymentUrl,
                    })
                  );
                  return (
                    <TableRow key={ord.id}>
                      <TableCell>
                        <Link
                          href={`/admin/commandes/${ord.id}`}
                          className="font-bold text-brand-700 hover:underline"
                        >
                          {ord.orderNumber}
                        </Link>
                        {ord.invoiceNumber && (
                          <p className="font-mono text-[11px] text-slate-500">{ord.invoiceNumber}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-navy-900">{ord.clientName}</p>
                        {ord.clientPhone && (
                          <p className="text-xs text-slate-500">{ord.clientPhone}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-navy-900">
                        {formatXof(ord.totalClientXof)}
                      </TableCell>
                      <TableCell>
                        {ord.paymentDueAt ? (
                          <Badge variant={ord.isOverdue ? "danger" : "warning"}>
                            {ord.isOverdue ? "En retard • " : ""}
                            {formatDateDakar(ord.paymentDueAt)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Relancer WhatsApp + Wave
                            </a>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="navy"
                            isLoading={busyId === ord.id}
                            onClick={() => settleCreditOrder(ord.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Encaisser solde
                          </Button>
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

      {/* SECTION 2 : PLAFONDS CRÉDIT PAR CLIENT INSCRIT */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-navy-900">
          Comptes clients inscrits & autorisations Crédit Pro (J+7 / J+15 / J+30)
        </h2>

        {restaurants.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="Aucun compte client inscrit"
            description="Le Crédit Pro s'active sur les établissements disposant d'un compte client FoodSupply (les clients sans compte règlent directement par Wave ou à la livraison)."
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Établissement</TableHeaderCell>
                  <TableHeaderCell>Crédit actif</TableHeaderCell>
                  <TableHeaderCell>Plafond (FCFA)</TableHeaderCell>
                  <TableHeaderCell>Délai</TableHeaderCell>
                  <TableHeaderCell>Encours actuel</TableHeaderCell>
                  <TableHeaderCell className="text-right">Enregistrer</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {restaurants.map((r) => {
                  const st = edits[r.id]!;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-semibold text-navy-900">{r.businessName}</p>
                        <p className="text-xs text-slate-500">
                          {r.ownerName} • {r.contactPhone}
                        </p>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={st.creditEnabled}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...st, creditEnabled: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-brand-600"
                        />
                      </TableCell>
                      <TableCell className="w-40">
                        <Input
                          type="number"
                          min={0}
                          step={50000}
                          value={st.creditLimitXof}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...st, creditLimitXof: e.target.value },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="w-32">
                        <Select
                          value={st.creditTermDays}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [r.id]: { ...st, creditTermDays: e.target.value },
                            }))
                          }
                        >
                          <option value="7">J+7</option>
                          <option value="15">J+15</option>
                          <option value="30">J+30</option>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-navy-900">
                        {formatXof(r.usedCreditXof)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          isLoading={busyId === r.id}
                          onClick={() => saveRestaurantCredit(r.id)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          Sauver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    </div>
  );
}
