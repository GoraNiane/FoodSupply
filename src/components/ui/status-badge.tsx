import type {
  AvailabilityStatus,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  SettlementStatus,
  SupplierSubmissionStatus,
  VerificationStatus,
} from "@prisma/client";
import { Badge, type BadgeProps } from "./badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  BROUILLON: { label: "Brouillon", variant: "neutral" },
  EN_ATTENTE_CONFIRMATION: { label: "En attente confirmation", variant: "warning" },
  PARTIELLEMENT_CONFIRME: { label: "Proposition à valider", variant: "brand" },
  EN_ATTENTE_PAIEMENT: { label: "En attente de paiement", variant: "info" },
  PAYEE: { label: "Payée", variant: "success" },
  EN_PREPARATION: { label: "En préparation", variant: "navy" },
  PRETE_A_COLLECTER: { label: "Prête à collecter", variant: "navy" },
  EN_COLLECTE: { label: "En collecte", variant: "brand" },
  EN_LIVRAISON: { label: "En livraison", variant: "brand" },
  LIVREE: { label: "Livrée", variant: "success" },
  ANNULEE: { label: "Annulée", variant: "neutral" },
  REMBOURSEMENT_EN_COURS: { label: "Remboursement en cours", variant: "warning" },
  REMBOURSEE: { label: "Remboursée", variant: "info" },
  ECHEC: { label: "Échec", variant: "danger" },
};

export const VERIFICATION_STATUS_META: Record<
  VerificationStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: "En attente", variant: "warning" },
  UNDER_REVIEW: { label: "En cours d'examen", variant: "info" },
  APPROVED: { label: "Validé", variant: "success" },
  REJECTED: { label: "Refusé", variant: "danger" },
  SUSPENDED: { label: "Suspendu", variant: "danger" },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  INITIATED: { label: "Initié", variant: "neutral" },
  PENDING: { label: "En attente", variant: "warning" },
  SUCCEEDED: { label: "Confirmé", variant: "success" },
  FAILED: { label: "Échoué", variant: "danger" },
  CANCELLED: { label: "Annulé", variant: "neutral" },
  EXPIRED: { label: "Expiré", variant: "neutral" },
  REFUNDED: { label: "Remboursé", variant: "info" },
  PARTIALLY_REFUNDED: { label: "Partiellement remboursé", variant: "info" },
};

export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING_ASSIGNMENT: { label: "À affecter", variant: "warning" },
  ASSIGNED: { label: "Livreur affecté", variant: "info" },
  ACCEPTED: { label: "Mission acceptée", variant: "navy" },
  PICKING_UP: { label: "Collecte en cours", variant: "brand" },
  IN_TRANSIT: { label: "En livraison", variant: "brand" },
  DELIVERED: { label: "Livrée", variant: "success" },
  INCIDENT: { label: "Incident signalé", variant: "danger" },
  CANCELLED: { label: "Annulée", variant: "neutral" },
};

export const AVAILABILITY_STATUS_META: Record<
  AvailabilityStatus,
  { label: string; variant: BadgeVariant }
> = {
  IN_STOCK: { label: "Disponible", variant: "success" },
  ON_CONFIRMATION: { label: "Sur confirmation", variant: "warning" },
  OUT_OF_STOCK: { label: "Rupture", variant: "danger" },
};

export const SETTLEMENT_STATUS_META: Record<
  SettlementStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: "À régler", variant: "warning" },
  SCHEDULED: { label: "Planifié", variant: "info" },
  PAID: { label: "Réglé", variant: "success" },
  CANCELLED: { label: "Annulé", variant: "neutral" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const meta = VERIFICATION_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const meta = DELIVERY_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const meta = AVAILABILITY_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export const SUBMISSION_STATUS_META: Record<
  SupplierSubmissionStatus,
  { label: string; variant: BadgeVariant }
> = {
  EN_ATTENTE_VALIDATION: { label: "En attente de validation", variant: "warning" },
  EN_COURS_EXAMEN: { label: "En cours d'examen", variant: "info" },
  APPROUVE: { label: "Approuvé", variant: "success" },
  REFUSE: { label: "Refusé", variant: "danger" },
  SUSPENDU: { label: "Suspendu", variant: "neutral" },
};

export function SubmissionStatusBadge({ status }: { status: SupplierSubmissionStatus }) {
  const meta = SUBMISSION_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const meta = SETTLEMENT_STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}
