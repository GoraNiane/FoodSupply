"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  FileDown,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Truck,
  XCircle,
} from "lucide-react";
import type {
  InvoicePaymentStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  OrderStatusBadge,
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
import { ALLOWED_ORDER_TRANSITIONS } from "@/modules/orders/state-machine";
import {
  buildDriverDispatchedMessage,
  buildOrderConfirmedWaveMessage,
  buildWhatsAppLink,
} from "@/modules/notifications/whatsapp";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export interface AdminOrderDetailView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  isGuestOrder: boolean;
  isCreditOrder: boolean;
  paymentDueAt: string | null;
  wavePaymentUrl: string | null;
  createdAt: string;
  subtotalSupplierXof: number;
  subtotalClientXof: number;
  marginTotalXof: number;
  deliveryFeeXof: number;
  totalClientXof: number;
  notes: string | null;
  address: {
    restaurantName?: string;
    contactName?: string;
    phone?: string;
    email?: string | null;
    neighborhood?: string;
    street?: string;
    landmark?: string | null;
    mapsUrl?: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    paymentStatus: InvoicePaymentStatus;
  } | null;
  payments: Array<{
    id: string;
    reference: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amountXof: number;
    providerTransactionId: string | null;
    paidAt: string | null;
    clientDeclaredPaid: boolean;
    clientDeclarationRef: string | null;
    payerPhone: string | null;
  }>;
  delivery: {
    externalDriverName: string | null;
    externalDriverPhone: string | null;
    requiresColdChain: boolean;
    hasFragileItems: boolean;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    unitLabel: string;
    requestedQty: number;
    confirmedQty: number | null;
    requestedSupplierPriceXof: number;
    confirmedSupplierPriceXof: number | null;
    clientUnitPriceXof: number;
    itemStatus: OrderItemStatus;
  }>;
  history: Array<{
    id: string;
    toStatus: OrderStatus;
    reason: string | null;
    createdAt: string;
  }>;
}

export function AdminOrderDetailClient({ order }: { order: AdminOrderDetailView }) {
  const router = useRouter();
  const { notify } = useToast();

  const [rows, setRows] = React.useState(() =>
    order.items.map((item) => ({
      orderItemId: item.id,
      productName: item.productName,
      unitLabel: item.unitLabel,
      requestedQty: item.requestedQty,
      confirmedQty: item.confirmedQty ?? item.requestedQty,
      supplierPriceXof: item.confirmedSupplierPriceXof ?? item.requestedSupplierPriceXof,
      clientUnitPriceXof: item.clientUnitPriceXof,
      initialClientUnitPriceXof: item.clientUnitPriceXof,
    }))
  );
  const [deliveryFeeXof, setDeliveryFeeXof] = React.useState(String(order.deliveryFeeXof));
  const [adminNote, setAdminNote] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Livraison hors-app & transitions
  const [driverName, setDriverName] = React.useState(order.delivery?.externalDriverName ?? "");
  const [driverPhone, setDriverPhone] = React.useState(order.delivery?.externalDriverPhone ?? "");
  const [statusReason, setStatusReason] = React.useState("");
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Encaissement Wave / espèces
  const pendingPayment = order.payments.find((p) => p.status === "PENDING") ?? null;
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    pendingPayment?.method ?? "WAVE"
  );
  const [waveTxId, setWaveTxId] = React.useState(pendingPayment?.clientDeclarationRef ?? "");
  const [paymentNote, setPaymentNote] = React.useState("");
  const [isConfirmingPayment, setIsConfirmingPayment] = React.useState(false);

  async function handleConfirmPaymentReceived(e: React.FormEvent) {
    e.preventDefault();
    setIsConfirmingPayment(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentId: pendingPayment?.id,
          method: paymentMethod,
          providerTransactionId: waveTxId.trim() || undefined,
          note: paymentNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de valider le paiement.");
        return;
      }
      notify({
        type: "success",
        title: "Paiement encaissé & facture générée !",
        description: `Facture ${data.invoiceNumber} créée automatiquement.`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsConfirmingPayment(false);
    }
  }

  const canReviewStockPrice =
    order.status === "EN_ATTENTE_CONFIRMATION" || order.status === "PARTIELLEMENT_CONFIRME";

  const previewClientSub = rows.reduce((s, r) => s + r.confirmedQty * r.clientUnitPriceXof, 0);
  const previewSupplierSub = rows.reduce((s, r) => s + r.confirmedQty * r.supplierPriceXof, 0);
  const previewMargin = previewClientSub - previewSupplierSub;
  const previewDelivery = Math.max(0, Math.round(Number(deliveryFeeXof || 0)));
  const previewTotal = previewClientSub + previewDelivery;

  const hasChanges =
    rows.some(
      (r) =>
        r.confirmedQty !== r.requestedQty || r.clientUnitPriceXof !== r.initialClientUnitPriceXof
    ) || previewDelivery !== order.deliveryFeeXof;

  async function handleConfirmOrder(e: React.FormEvent) {
    e.preventDefault();
    setIsConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({
            orderItemId: r.orderItemId,
            confirmedQty: r.confirmedQty,
            confirmedClientUnitPriceXof: r.clientUnitPriceXof,
            confirmedSupplierUnitPriceXof: r.supplierPriceXof,
          })),
          deliveryFeeXof: previewDelivery,
          adminNote: adminNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de confirmer la commande.");
        return;
      }
      notify({
        type: "success",
        title: data.requiresClientApproval
          ? "Proposition révisée envoyée au client"
          : "Commande confirmée — prête au paiement",
        description: `Nouveau total : ${formatXof(data.totalClientXof)}`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleTransition(nextStatus: OrderStatus) {
    setIsTransitioning(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextStatus,
          reason: statusReason || undefined,
          externalDriverName: driverName || undefined,
          externalDriverPhone: driverPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Changement de statut impossible.");
        return;
      }
      notify({
        type: "success",
        title: "Statut mis à jour",
        description: `Commande passée à ${nextStatus}`,
      });
      setCancelModalOpen(false);
      setStatusReason("");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsTransitioning(false);
    }
  }

  const allowedNext = ALLOWED_ORDER_TRANSITIONS[order.status];
  const clientName = order.address.restaurantName || order.address.contactName || "Client";
  const waConfirmWaveUrl = buildWhatsAppLink(
    order.address.phone,
    buildOrderConfirmedWaveMessage({
      clientName,
      orderNumber: order.orderNumber,
      totalClientXof: order.totalClientXof,
      waveUrl: order.wavePaymentUrl,
    })
  );
  const waDriverUrl = buildWhatsAppLink(
    order.address.phone,
    buildDriverDispatchedMessage({
      clientName,
      orderNumber: order.orderNumber,
      driverName: driverName || order.delivery?.externalDriverName,
      driverPhone: driverPhone || order.delivery?.externalDriverPhone,
      etaNote: statusReason || undefined,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">Commande {order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
            <Badge variant={order.isGuestOrder ? "warning" : "navy"}>
              {order.isGuestOrder ? "Invité (sans compte)" : "Client inscrit"}
            </Badge>
            {order.isCreditOrder && (
              <Badge variant="brand">
                Crédit Pro {order.paymentDueAt ? `(Échéance ${formatDateDakar(order.paymentDueAt)})` : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Reçue le {formatDateDakar(order.createdAt, true)} • {order.address.restaurantName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.invoice ? (
            <a
              href={`/api/invoices/${order.invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800"
            >
              <FileText className="h-3.5 w-3.5" />
              Facture PDF ({order.invoice.invoiceNumber})
            </a>
          ) : (
            <a
              href={`/api/orders/${encodeURIComponent(order.orderNumber)}/proforma`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
            >
              <FileDown className="h-3.5 w-3.5 text-brand-600" />
              Proforma PDF
            </a>
          )}
          <a
            href={`/api/v1/admin/orders/${order.id}/delivery-slip`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
          >
            <Truck className="h-3.5 w-3.5 text-navy-700" />
            Bon de livraison PDF
          </a>
          {order.address.mapsUrl && (
            <a
              href={order.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-800 hover:bg-brand-100"
            >
              <MapPin className="h-3.5 w-3.5" />
              Google Maps GPS
            </a>
          )}
          {order.address.phone && (
            <a
              href={`tel:${order.address.phone}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
            >
              <Phone className="h-3.5 w-3.5 text-brand-500" />
              Appeler
            </a>
          )}
          {waConfirmWaveUrl && (
            <a
              href={waConfirmWaveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp : Confirmation + Wave
            </a>
          )}
          {waDriverUrl && (
            <a
              href={waDriverUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-800 px-3 text-xs font-semibold text-white hover:bg-navy-900"
            >
              <Truck className="h-3.5 w-3.5" />
              WhatsApp : Départ livreur
            </a>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* MODULE PAIEMENT WAVE / ENCAISSEMENT */}
      {(order.status === "EN_ATTENTE_PAIEMENT" || order.status === "ECHEC") && (
        <Card className="border-2 border-brand-300 bg-brand-50/40 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
                <CreditCard className="h-4 w-4" />
                Validation de l&apos;encaissement Wave / Règlement client
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Une fois le transfert Wave de{" "}
                <strong className="text-navy-900">{formatXof(order.totalClientXof)}</strong> reçu
                sur votre compte marchand, validez l&apos;encaissement ci-dessous : la commande
                passera en <strong>PAYÉE</strong> et la facture PDF sera générée immédiatement.
              </p>
            </div>
            {pendingPayment?.clientDeclaredPaid && (
              <Badge variant="success">
                Client a déclaré avoir payé ({pendingPayment.clientDeclarationRef || "Wave"})
              </Badge>
            )}
          </div>

          {pendingPayment?.payerPhone && (
            <p className="mt-2 text-xs text-slate-600">
              Téléphone Wave indiqué par le client : <strong>{pendingPayment.payerPhone}</strong>
            </p>
          )}

          <form
            onSubmit={handleConfirmPaymentReceived}
            className="mt-4 grid gap-3 sm:grid-cols-4"
          >
            <FormField label="Mode de règlement" htmlFor="pay-method">
              <Select
                id="pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="WAVE">Wave Sénégal</option>
                <option value="CASH_ON_DELIVERY">Paiement à la livraison</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
              </Select>
            </FormField>

            <FormField label="Réf. transaction Wave (optionnel)" htmlFor="pay-tx-id">
              <Input
                id="pay-tx-id"
                value={waveTxId}
                onChange={(e) => setWaveTxId(e.target.value)}
                placeholder="Ex. T261126..."
              />
            </FormField>

            <FormField label="Note interne (optionnel)" htmlFor="pay-note">
              <Input
                id="pay-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Ex. Reçu sur Wave FoodSupply"
              />
            </FormField>

            <div className="flex items-end">
              <Button
                type="submit"
                variant="success"
                className="w-full"
                isLoading={isConfirmingPayment}
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider paiement ({formatXof(order.totalClientXof)})
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* MODULE 1 : CONFIRMATION STOCKS & PRIX AVANT PAIEMENT */}
      {canReviewStockPrice && (
        <Card className="border-brand-300 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-navy-900">
              Vérification des stocks & prix (Avant paiement)
            </h2>
            <p className="text-xs text-slate-500">
              Confirmez les quantités disponibles et ajustez si nécessaire le tarif. Si rien ne
              change, la commande passe directement en attente de paiement ; en cas d&apos;ajustement,
              le client devra approuver la nouvelle proposition.
            </p>
          </div>

          <form onSubmit={handleConfirmOrder} className="space-y-4">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Produit</TableHeaderCell>
                    <TableHeaderCell>Qté demandée</TableHeaderCell>
                    <TableHeaderCell>Qté confirmée</TableHeaderCell>
                    <TableHeaderCell>Coût achat (FCFA)</TableHeaderCell>
                    <TableHeaderCell>Prix client (FCFA)</TableHeaderCell>
                    <TableHeaderCell className="text-right">Sous-total client</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row.orderItemId}>
                      <TableCell>
                        <p className="font-semibold text-navy-900">{row.productName}</p>
                        <p className="text-xs text-slate-500">{row.unitLabel}</p>
                      </TableCell>
                      <TableCell className="font-medium">{row.requestedQty}</TableCell>
                      <TableCell className="w-28">
                        <Input
                          type="number"
                          min={0}
                          value={row.confirmedQty}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, confirmedQty: val } : r))
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="w-36">
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={row.supplierPriceXof}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, supplierPriceXof: val } : r))
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="w-36">
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={row.clientUnitPriceXof}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, clientUnitPriceXof: val } : r
                              )
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatXof(row.confirmedQty * row.clientUnitPriceXof)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Frais de livraison (FCFA)" htmlFor="adm-delivery-fee">
                <Input
                  id="adm-delivery-fee"
                  type="number"
                  min={0}
                  step={250}
                  value={deliveryFeeXof}
                  onChange={(e) => setDeliveryFeeXof(e.target.value)}
                />
              </FormField>

              <FormField
                label="Message / Note pour le client (optionnel)"
                htmlFor="adm-note"
                className="md:col-span-2"
              >
                <Input
                  id="adm-note"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ex. Tous les produits sont disponibles pour livraison demain matin."
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-muted p-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Nouveau total client</span>
                  <strong className="text-lg text-navy-900">{formatXof(previewTotal)}</strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Marge brute estimée</span>
                  <strong className="text-lg text-success-600">
                    +{formatXof(previewMargin)}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Statut résultant</span>
                  <Badge variant={hasChanges ? "brand" : "success"}>
                    {hasChanges ? "Proposition révisée à valider" : "Confirmée 100 % → Paiement"}
                  </Badge>
                </div>
              </div>

              <Button type="submit" isLoading={isConfirming} size="lg">
                <CheckCircle2 className="h-4 w-4" />
                {hasChanges ? "Envoyer la proposition révisée" : "Confirmer la commande"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* MODULE 2 : LOGISTIQUE HORS-APP & CHANGEMENT DE STATUT */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 space-y-4 lg:col-span-7">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-500" />
            <h2 className="text-base font-bold text-navy-900">
              Pilotage préparation & livraison (livreur géré hors application)
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom du livreur externe (optionnel)" htmlFor="drv-name">
              <Input
                id="drv-name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Ex. Mamadou Diop"
              />
            </FormField>
            <FormField label="Téléphone livreur (affiché au client)" htmlFor="drv-phone">
              <Input
                id="drv-phone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+221 77 123 45 67"
              />
            </FormField>
          </div>

          <FormField label="Commentaire d'étape (optionnel)" htmlFor="status-reason">
            <Input
              id="status-reason"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Ex. Colis remis au livreur, arrivée estimée 11h30"
            />
          </FormField>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {allowedNext
              .filter((st) => st !== "ANNULEE" && st !== "PARTIELLEMENT_CONFIRME")
              .map((nextStatus) => (
                <Button
                  key={nextStatus}
                  type="button"
                  variant={nextStatus === "LIVREE" ? "success" : "navy"}
                  size="sm"
                  isLoading={isTransitioning}
                  onClick={() => handleTransition(nextStatus)}
                >
                  Passer à : {nextStatus.replace(/_/g, " ")}
                </Button>
              ))}

            {allowedNext.includes("ANNULEE") && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isTransitioning}
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Annuler la commande
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-3 text-sm lg:col-span-5">
          <h2 className="text-base font-bold text-navy-900">Coordonnées & Finances</h2>
          <p className="font-semibold text-navy-900">{order.address.restaurantName}</p>
          <p className="text-slate-600">
            {order.address.street}, {order.address.neighborhood}, Dakar
          </p>
          {order.address.landmark && (
            <p className="text-xs text-slate-500">Repère : {order.address.landmark}</p>
          )}
          <p className="text-xs text-slate-600">
            Contact : {order.address.contactName} — {order.address.phone}
          </p>
          {order.notes && (
            <p className="rounded-lg bg-surface-muted p-2.5 text-xs text-slate-600">
              Note client : {order.notes}
            </p>
          )}

          <div className="space-y-1.5 border-t border-surface-border pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Coût d&apos;achat total</span>
              <span>{formatXof(order.subtotalSupplierXof)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Marge commerciale</span>
              <span className="font-semibold text-success-600">+{formatXof(order.marginTotalXof)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Livraison Dakar</span>
              <span>{formatXof(order.deliveryFeeXof)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold text-navy-900">
              <span>Total client</span>
              <span className="text-brand-600">{formatXof(order.totalClientXof)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* HISTORIQUE */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-navy-900">Journal chronologique de la commande</h2>
        <ol className="mt-4 space-y-3 border-l-2 border-navy-100 pl-4">
          {order.history.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={h.toStatus} />
                <span className="text-xs text-slate-500">{formatDateDakar(h.createdAt, true)}</span>
              </div>
              {h.reason && <p className="mt-1 text-xs text-slate-600">{h.reason}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={cancelModalOpen}
        title="Annuler définitivement cette commande ?"
        description="Cette transition est définitive. Saisissez si besoin une raison dans le champ commentaire."
        confirmLabel="Oui, annuler"
        isLoading={isTransitioning}
        onConfirm={() => handleTransition("ANNULEE")}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}
