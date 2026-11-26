"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  MapPin,
  Phone,
  RotateCcw,
  Smartphone,
  Truck,
  Wallet,
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
  Input,
  ORDER_CHECKOUT_STEPS,
  OrderStatusBadge,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@/components/ui";
import { useCart, type CartItemEntry } from "@/components/cart/cart-context";
import { getOrderStepperIndex } from "@/modules/orders/state-machine";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export interface TrackedOrderView {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  subtotalClientXof: number;
  deliveryFeeXof: number;
  totalClientXof: number;
  requiresClientApproval: boolean;
  isCreditOrder: boolean;
  paymentDueAt: string | null;
  notes: string | null;
  wavePaymentUrl: string | null;
  allowCashOnDelivery: boolean;
  allowOrangeMoney: boolean;
  orangeMoneyMerchantCode: string;
  creditPro: {
    limitXof: number;
    usedXof: number;
    remainingXof: number;
    termDays: number;
  } | null;
  reorderItems: CartItemEntry[];
  latestPayment: {
    id: string;
    reference: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amountXof: number;
    paidAt: string | null;
    clientDeclaredPaid: boolean;
    clientDeclarationRef: string | null;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    paymentStatus: InvoicePaymentStatus;
    issuedAt: string;
  } | null;
  address: {
    restaurantName?: string;
    contactName?: string;
    phone?: string;
    neighborhood?: string;
    street?: string;
    landmark?: string | null;
    mapsUrl?: string | null;
  };
  delivery: {
    externalDriverName: string | null;
    externalDriverPhone: string | null;
    requiresColdChain: boolean;
    hasFragileItems: boolean;
    deliveredAt: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    unitLabel: string;
    requestedQty: number;
    confirmedQty: number | null;
    clientUnitPriceXof: number;
    lineClientTotalXof: number;
    itemStatus: OrderItemStatus;
  }>;
  history: Array<{
    id: string;
    toStatus: OrderStatus;
    reason: string | null;
    createdAt: string;
  }>;
}

const CLIENT_TRACKING_MILESTONES: Array<{ label: string; reachedOn: OrderStatus[] }> = [
  {
    label: "Commande reçue",
    reachedOn: [
      "EN_ATTENTE_CONFIRMATION",
      "PARTIELLEMENT_CONFIRME",
      "EN_ATTENTE_PAIEMENT",
      "PAYEE",
      "EN_PREPARATION",
      "PRETE_A_COLLECTER",
      "EN_COLLECTE",
      "EN_LIVRAISON",
      "LIVREE",
    ],
  },
  {
    label: "Disponibilité en cours de vérification",
    reachedOn: [
      "EN_ATTENTE_CONFIRMATION",
      "PARTIELLEMENT_CONFIRME",
      "EN_ATTENTE_PAIEMENT",
      "PAYEE",
      "EN_PREPARATION",
      "PRETE_A_COLLECTER",
      "EN_COLLECTE",
      "EN_LIVRAISON",
      "LIVREE",
    ],
  },
  {
    label: "Commande confirmée",
    reachedOn: [
      "EN_ATTENTE_PAIEMENT",
      "PAYEE",
      "EN_PREPARATION",
      "PRETE_A_COLLECTER",
      "EN_COLLECTE",
      "EN_LIVRAISON",
      "LIVREE",
    ],
  },
  {
    label: "Préparation de la collecte",
    reachedOn: ["EN_PREPARATION", "PRETE_A_COLLECTER", "EN_COLLECTE", "EN_LIVRAISON", "LIVREE"],
  },
  {
    label: "Produits récupérés",
    reachedOn: ["EN_COLLECTE", "EN_LIVRAISON", "LIVREE"],
  },
  {
    label: "Livraison en cours",
    reachedOn: ["EN_LIVRAISON", "LIVREE"],
  },
  {
    label: "Commande livrée",
    reachedOn: ["LIVREE"],
  },
];

export function OrderTrackingClient({
  order,
  guestToken,
}: {
  order: TrackedOrderView;
  guestToken?: string | null;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const { addManyItems, rememberGuestOrder } = useCart();

  const [isDeciding, setIsDeciding] = React.useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Paiement Wave / Orange Money / Crédit Pro
  const [declareMethod, setDeclareMethod] = React.useState<"WAVE" | "ORANGE_MONEY">("WAVE");
  const [paymentRef, setPaymentRef] = React.useState("");
  const [payerPhone, setPayerPhone] = React.useState(order.address.phone ?? "");
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const [showDeclareForm, setShowDeclareForm] = React.useState(false);

  // Mémorise automatiquement cette commande sur l'appareil du client (zéro lien perdu sans compte)
  React.useEffect(() => {
    const trackingUrl = guestToken
      ? `/suivi/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(guestToken)}`
      : `/suivi/${encodeURIComponent(order.orderNumber)}`;
    rememberGuestOrder({
      orderNumber: order.orderNumber,
      trackingUrl,
      totalClientXof: order.totalClientXof,
      createdAt: order.createdAt,
      restaurantName: order.address.restaurantName,
    });
  }, [
    guestToken,
    order.address.restaurantName,
    order.createdAt,
    order.orderNumber,
    order.totalClientXof,
    rememberGuestOrder,
  ]);

  const tokenQuery = guestToken ? `?token=${encodeURIComponent(guestToken)}` : "";
  const invoicePdfUrl = order.invoice ? `/api/invoices/${order.invoice.id}/pdf${tokenQuery}` : null;
  const proformaPdfUrl = `/api/orders/${encodeURIComponent(order.orderNumber)}/proforma${tokenQuery}`;

  function handleReorderIdentical() {
    if (order.reorderItems.length === 0) {
      notify({
        type: "info",
        title: "Produits indisponibles",
        description: "Aucun produit de cette commande n'est actuellement actif au catalogue.",
      });
      return;
    }
    addManyItems(order.reorderItems);
    notify({
      type: "success",
      title: "Panier rechargé à l'identique !",
      description: `${order.reorderItems.length} article(s) ajouté(s) à votre panier.`,
    });
    router.push("/panier");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify({
        type: "success",
        title: "Lien de suivi copié",
        description: "Conservez ce lien sécurisé pour suivre votre commande à tout moment.",
      });
    } catch {
      notify({ type: "info", title: "Copiez l'URL depuis la barre de votre navigateur." });
    }
  }

  async function submitDecision(decision: "ACCEPT" | "REJECT") {
    setIsDeciding(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/orders/${encodeURIComponent(order.orderNumber)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, guestToken: guestToken ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action impossible.");
        return;
      }
      notify({
        type: "success",
        title: decision === "ACCEPT" ? "Proposition acceptée !" : "Commande annulée",
        description:
          decision === "ACCEPT"
            ? "Vous pouvez maintenant régler directement par Wave."
            : "Aucun montant n'a été facturé.",
      });
      setConfirmRejectOpen(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsDeciding(false);
    }
  }

  function handleWaveButtonClick() {
    setDeclareMethod("WAVE");
    setShowDeclareForm(true);
    void fetch("/api/v1/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        method: "WAVE",
        guestToken: guestToken ?? undefined,
        clientDeclaredPaid: false,
      }),
    }).catch(() => {});
  }

  async function handleDeclarePaid(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingPayment(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          method: declareMethod,
          guestToken: guestToken ?? undefined,
          clientDeclaredPaid: true,
          clientDeclarationRef: paymentRef.trim() || undefined,
          payerPhone: payerPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de signaler le paiement.");
        return;
      }
      notify({
        type: "success",
        title: `Paiement ${declareMethod === "WAVE" ? "Wave" : "Orange Money"} signalé !`,
        description: "Notre équipe vérifie la réception pour lancer la préparation.",
      });
      setShowDeclareForm(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleSelectCashOnDelivery() {
    setIsSubmittingPayment(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          method: "CASH_ON_DELIVERY",
          guestToken: guestToken ?? undefined,
          clientDeclaredPaid: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer ce choix.");
        return;
      }
      notify({
        type: "success",
        title: "Paiement à la livraison enregistré",
        description: "Notre équipe FoodSupply confirme votre créneau de livraison.",
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleUseCreditPro() {
    setIsSubmittingPayment(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Validation Crédit Pro impossible.");
        return;
      }
      notify({
        type: "success",
        title: "Commande lancée sur votre Crédit Pro !",
        description: `Facture ${data.invoiceNumber} émise — livraison mise en préparation.`,
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  const canPayNow = order.status === "EN_ATTENTE_PAIEMENT" || order.status === "ECHEC";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">Commande {order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
            {order.isCreditOrder && (
              <Badge variant="navy">
                Crédit Pro
                {order.paymentDueAt ? ` • Échéance ${formatDateDakar(order.paymentDueAt)}` : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Soumise le {formatDateDakar(order.createdAt, true)} • {order.address.restaurantName} (
            {order.address.neighborhood}, Dakar)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order.reorderItems.length > 0 && (
            <Button type="button" variant="primary" size="sm" onClick={handleReorderIdentical}>
              <RotateCcw className="h-4 w-4" />
              Recommander à l&apos;identique
            </Button>
          )}
          {invoicePdfUrl && order.invoice ? (
            <a
              href={invoicePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <FileText className="h-4 w-4" />
              Facture PDF ({order.invoice.invoiceNumber})
            </a>
          ) : (
            <a
              href={proformaPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-navy-200 bg-white px-3.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-surface-muted"
            >
              <FileDown className="h-4 w-4 text-brand-600" />
              Devis Proforma PDF
            </a>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="h-4 w-4" />
            Copier le lien
          </Button>
        </div>
      </div>

      <Stepper steps={ORDER_CHECKOUT_STEPS} currentStepIndex={getOrderStepperIndex(order.status)} />

      {/* ÉTAPES DÉTAILLÉES CLIENT (SANS AUCUNE DONNÉE FOURNISSEUR CONFIDENTIELLE) */}
      {order.status !== "ANNULEE" && order.status !== "REMBOURSEE" && (
        <Card className="p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Avancement de votre commande FoodSupply
          </p>
          <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
            {CLIENT_TRACKING_MILESTONES.map((step) => {
              const reached = step.reachedOn.includes(order.status);
              return (
                <li
                  key={step.label}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${
                    reached
                      ? "border-brand-300 bg-brand-50/70 text-brand-800"
                      : "border-surface-border bg-surface-muted/50 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      reached ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-tight">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ALERTE ACTION CLIENT SI PROPOSITION RÉVISÉE */}
      {order.status === "PARTIELLEMENT_CONFIRME" && (
        <Alert variant="warning" title="Votre validation est requise avant paiement">
          <p>
            FoodSupply a vérifié vos produits et ajusté certaines quantités ou tarifs dans le
            tableau ci-dessous. Nouveau montant total définitif :{" "}
            <strong className="text-navy-900">{formatXof(order.totalClientXof)}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="success"
              onClick={() => submitDecision("ACCEPT")}
              isLoading={isDeciding}
            >
              <CheckCircle2 className="h-4 w-4" />
              Accepter le montant définitif ({formatXof(order.totalClientXof)})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRejectOpen(true)}
              disabled={isDeciding}
            >
              <XCircle className="h-4 w-4" />
              Refuser et annuler
            </Button>
          </div>
        </Alert>
      )}

      {order.status === "EN_ATTENTE_CONFIRMATION" && (
        <Alert variant="info" title="Vérification des stocks et prix en cours">
          Notre équipe FoodSupply Dakar vérifie actuellement la disponibilité et les tarifs exacts
          de vos produits. Vous pouvez déjà télécharger votre{" "}
          <a href={proformaPdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Devis Proforma PDF
          </a>
          . Dès confirmation, le bouton <strong>Payer par Wave</strong> apparaîtra ici avec le
          montant pré-rempli.
        </Alert>
      )}

      {/* BLOC PAIEMENT DIRECT WAVE SÉNÉGAL (+ ORANGE MONEY + CRÉDIT PRO) */}
      {canPayNow && (
        <Card className="border-2 border-brand-400 bg-gradient-to-br from-brand-50/70 via-white to-sky-50/60 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-bold text-brand-700">
                <Smartphone className="h-3.5 w-3.5" />
                Commande confirmée — Règlement sécurisé Wave Sénégal
              </div>
              <h2 className="text-xl font-extrabold text-navy-900">
                Montant à régler :{" "}
                <span className="text-brand-600">{formatXof(order.totalClientXof)}</span>
              </h2>
              <p className="max-w-xl text-sm text-slate-600">
                Cliquez sur <strong>Payer par Wave</strong> : votre application Wave s&apos;ouvre
                automatiquement en phase de paiement avec{" "}
                <strong>{formatXof(order.totalClientXof)}</strong> déjà pré-rempli.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {order.wavePaymentUrl && (
                <a
                  href={order.wavePaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWaveButtonClick}
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#1DC4FF] px-6 py-3.5 text-base font-extrabold text-ink-900 shadow-md transition-all hover:bg-[#0BB5F2] active:scale-[0.99]"
                >
                  <Smartphone className="h-5 w-5" />
                  Payer par Wave ({formatXof(order.totalClientXof)})
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Option secondaire Orange Money si activée */}
          {order.allowOrangeMoney && order.orangeMoneyMerchantCode && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
              <div>
                <p className="font-bold">Option secondaire : Orange Money Sénégal</p>
                <p className="mt-0.5">
                  Code / Numéro marchand FoodSupply :{" "}
                  <strong className="font-mono text-sm">{order.orangeMoneyMerchantCode}</strong>{" "}
                  — Montant : <strong>{formatXof(order.totalClientXof)}</strong>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDeclareMethod("ORANGE_MONEY");
                  setShowDeclareForm(true);
                }}
              >
                J&apos;ai payé par Orange Money
              </Button>
            </div>
          )}

          {/* Option Crédit Pro B2B (J+7/J+15) pour comptes validés par l'Admin */}
          {order.creditPro && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-200 bg-navy-50/70 p-4 text-xs text-navy-900">
              <div className="flex items-start gap-2.5">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
                <div>
                  <p className="font-bold">
                    Votre ligne Crédit Pro B2B (Échéance J+{order.creditPro.termDays})
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    Disponible :{" "}
                    <strong>{formatXof(order.creditPro.remainingXof)}</strong> / plafond{" "}
                    {formatXof(order.creditPro.limitXof)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="navy"
                disabled={order.creditPro.remainingXof < order.totalClientXof}
                isLoading={isSubmittingPayment}
                onClick={handleUseCreditPro}
              >
                Commander sur mon Crédit Pro (J+{order.creditPro.termDays})
              </Button>
            </div>
          )}

          {/* Statut si le client a déjà signalé son transfert Wave/OM */}
          {order.latestPayment?.clientDeclaredPaid && order.latestPayment.status === "PENDING" ? (
            <div className="mt-4 rounded-xl border border-success-200 bg-success-50/80 p-4 text-sm text-success-900">
              <p className="font-bold">
                Paiement {order.latestPayment.method === "ORANGE_MONEY" ? "Orange Money" : "Wave"}{" "}
                signalé ({order.latestPayment.reference})
                {order.latestPayment.clientDeclarationRef
                  ? ` — Réf. client : ${order.latestPayment.clientDeclarationRef}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-success-800">
                Notre équipe FoodSupply vérifie la réception puis valide votre commande et émet
                votre facture PDF.
              </p>
            </div>
          ) : order.latestPayment?.method === "CASH_ON_DELIVERY" &&
            order.latestPayment.status === "PENDING" ? (
            <div className="mt-4 rounded-xl border border-navy-200 bg-navy-50/60 p-4 text-sm text-navy-900">
              <p className="font-bold">Option choisie : Paiement à la livraison</p>
              <p className="mt-1 text-xs text-slate-600">
                Vous pouvez toujours régler immédiatement par Wave grâce au bouton ci-dessus si vous
                le souhaitez.
              </p>
            </div>
          ) : null}

          {/* Confirmation facultative après retour de l'app Wave/OM + option COD */}
          <div className="mt-5 border-t border-brand-200/70 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDeclareForm((prev) => !prev)}
                className="text-xs font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
              >
                {showDeclareForm
                  ? "Masquer le formulaire de confirmation"
                  : "J'ai déjà effectué mon paiement Wave / OM → Prévenir FoodSupply"}
              </button>

              {order.allowCashOnDelivery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={isSubmittingPayment}
                  onClick={handleSelectCashOnDelivery}
                >
                  <Wallet className="h-4 w-4" />
                  Préférer le paiement à la livraison
                </Button>
              )}
            </div>

            {showDeclareForm && (
              <form
                onSubmit={handleDeclarePaid}
                className="mt-4 grid gap-3 rounded-xl border border-surface-border bg-white p-4 sm:grid-cols-3"
              >
                <div>
                  <label
                    htmlFor="wave-payer-phone"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Numéro {declareMethod === "WAVE" ? "Wave" : "Orange Money"} (optionnel)
                  </label>
                  <Input
                    id="wave-payer-phone"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="+221 77 ..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="wave-ref"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Référence transaction (optionnel)
                  </label>
                  <Input
                    id="wave-ref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Ex. T261126..."
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="success"
                    className="w-full"
                    isLoading={isSubmittingPayment}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmer ({declareMethod === "WAVE" ? "Wave" : "OM"})
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      )}

      {/* BANDEAU FACTURE PDF SI GÉNÉRÉE */}
      {order.invoice && invoicePdfUrl && (
        <Card className="border-success-200 bg-success-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-600 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-900">
                  Facture officielle disponible — {order.invoice.invoiceNumber}
                </p>
                <p className="text-xs text-slate-600">
                  Émise le {formatDateDakar(order.invoice.issuedAt, false)} • Montant TTC :{" "}
                  <strong>{formatXof(order.totalClientXof)}</strong>
                  {order.invoice.paymentStatus === "UNPAID" && order.paymentDueAt
                    ? ` • À régler avant le ${formatDateDakar(order.paymentDueAt)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {order.isCreditOrder &&
                order.invoice.paymentStatus === "UNPAID" &&
                order.wavePaymentUrl && (
                  <a
                    href={order.wavePaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1DC4FF] px-4 py-2.5 text-sm font-bold text-ink-900 hover:bg-[#0BB5F2]"
                  >
                    <Smartphone className="h-4 w-4" />
                    Régler mon solde par Wave
                  </a>
                )}
              <a
                href={invoicePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                <FileText className="h-4 w-4" />
                Télécharger ma facture PDF
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* LIVREUR EXTERNE SI RENSEIGNÉ */}
      {order.delivery?.externalDriverName && (
        <Card className="border-navy-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Livreur en charge de votre livraison
                </p>
                <p className="text-base font-bold text-navy-900">
                  {order.delivery.externalDriverName}
                </p>
              </div>
            </div>
            {order.delivery.externalDriverPhone && (
              <a
                href={`tel:${order.delivery.externalDriverPhone}`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Phone className="h-4 w-4" />
                {order.delivery.externalDriverPhone}
              </a>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell>Qté demandée</TableHeaderCell>
                  <TableHeaderCell>Qté confirmée</TableHeaderCell>
                  <TableHeaderCell>Prix unitaire</TableHeaderCell>
                  <TableHeaderCell className="text-right">Total</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-semibold text-navy-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.unitLabel}</p>
                    </TableCell>
                    <TableCell>{item.requestedQty}</TableCell>
                    <TableCell>
                      {item.confirmedQty !== null ? (
                        <Badge
                          variant={
                            item.itemStatus === "REJECTED"
                              ? "danger"
                              : item.itemStatus === "ADJUSTED"
                                ? "warning"
                                : "success"
                          }
                        >
                          {item.confirmedQty}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">En attente</span>
                      )}
                    </TableCell>
                    <TableCell>{formatXof(item.clientUnitPriceXof)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatXof(item.lineClientTotalXof)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Card className="p-6">
            <h2 className="text-base font-bold text-navy-900">Historique de suivi</h2>
            <ol className="mt-4 space-y-3 border-l-2 border-navy-100 pl-4">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={h.toStatus} />
                    <span className="text-xs text-slate-500">
                      {formatDateDakar(h.createdAt, true)}
                    </span>
                  </div>
                  {h.reason && <p className="mt-1 text-xs text-slate-600">{h.reason}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="space-y-3 p-6">
            <h2 className="text-base font-bold text-navy-900">Montants (FCFA)</h2>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Sous-total produits</span>
              <span className="font-semibold text-navy-900">
                {formatXof(order.subtotalClientXof)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Livraison Dakar</span>
              <span className="font-semibold text-navy-900">{formatXof(order.deliveryFeeXof)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-3 text-base font-extrabold text-navy-900">
              <span>Total</span>
              <span className="text-brand-600">{formatXof(order.totalClientXof)}</span>
            </div>
          </Card>

          <Card className="space-y-2 p-6 text-sm">
            <h2 className="text-base font-bold text-navy-900">Adresse de livraison</h2>
            <p className="font-semibold text-navy-900">{order.address.restaurantName}</p>
            <p className="text-slate-600">
              {order.address.street}, {order.address.neighborhood}, Dakar
            </p>
            {order.address.landmark && (
              <p className="text-xs text-slate-500">Repère : {order.address.landmark}</p>
            )}
            <p className="text-xs text-slate-500">
              Contact : {order.address.contactName} ({order.address.phone})
            </p>
            {order.address.mapsUrl && (
              <a
                href={order.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" />
                Position GPS enregistrée (Google Maps)
              </a>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRejectOpen}
        title="Refuser cette proposition et annuler ?"
        description="Votre commande sera annulée sans aucun frais. Vous pourrez repasser commande à tout moment."
        confirmLabel="Oui, annuler"
        isLoading={isDeciding}
        onConfirm={() => submitDecision("REJECT")}
        onCancel={() => setConfirmRejectOpen(false)}
      />
    </div>
  );
}
