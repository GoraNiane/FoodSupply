"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wallet } from "lucide-react";
import type { OrderStatus, PayoutMethod, SettlementStatus } from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  OrderStatusBadge,
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

export interface AdminSettlementRow {
  supplierOrderId: string;
  reference: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  supplierName: string;
  supplierPhone: string;
  payoutMethod: PayoutMethod;
  amountXof: number;
  settlementStatus: SettlementStatus;
  settlementRef: string | null;
  externalTransferRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function AdminSettlementsManager({ rows }: { rows: AdminSettlementRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [refs, setRefs] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function markSettled(row: AdminSettlementRow) {
    setBusyId(row.supplierOrderId);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierOrderId: row.supplierOrderId,
          payoutMethod: row.payoutMethod,
          externalTransferRef: refs[row.supplierOrderId]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de marquer ce reversement payé.");
        return;
      }
      notify({
        type: "success",
        title: "Reversement fournisseur enregistré",
        description: `${row.supplierName} — ${formatXof(row.amountXof)} (${data.reference})`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="h-6 w-6" />}
        title="Aucun reversement à traiter"
        description="Les montants d'achat à reverser aux fournisseurs apparaîtront ici dès que des commandes seront payées ou livrées."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sous-commande / Commande</TableHeaderCell>
              <TableHeaderCell>Fournisseur (confidentiel)</TableHeaderCell>
              <TableHeaderCell>Montant achat</TableHeaderCell>
              <TableHeaderCell>Statut reversement</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.supplierOrderId}>
                <TableCell>
                  <Link
                    href={`/admin/commandes/${r.orderId}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {r.orderNumber}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{r.reference}</span>
                    <OrderStatusBadge status={r.orderStatus} />
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-navy-900">{r.supplierName}</p>
                  <p className="text-xs text-slate-500">
                    {r.supplierPhone} • {r.payoutMethod}
                  </p>
                </TableCell>
                <TableCell className="font-bold text-navy-900">
                  {formatXof(r.amountXof)}
                </TableCell>
                <TableCell>
                  {r.settlementStatus === "PAID" ? (
                    <div>
                      <Badge variant="success">Reversé</Badge>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {r.paidAt ? formatDateDakar(r.paidAt, true) : ""}
                        {r.externalTransferRef ? ` • Réf ${r.externalTransferRef}` : ""}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="warning">À reverser</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {r.settlementStatus !== "PAID" ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Input
                        className="h-8 w-36 text-xs"
                        placeholder="Réf. Wave/reçu"
                        value={refs[r.supplierOrderId] ?? ""}
                        onChange={(e) =>
                          setRefs((prev) => ({ ...prev, [r.supplierOrderId]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="success"
                        isLoading={busyId === r.supplierOrderId}
                        onClick={() => markSettled(r)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marquer reversé
                      </Button>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-slate-400">{r.settlementRef}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
