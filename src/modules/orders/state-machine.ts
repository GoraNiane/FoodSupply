import type { OrderStatus } from "@prisma/client";

/**
 * Machine à états serveur stricte couvrant les 14 statuts obligatoires FoodSupply.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  BROUILLON: ["EN_ATTENTE_CONFIRMATION", "ANNULEE"],
  EN_ATTENTE_CONFIRMATION: ["EN_ATTENTE_PAIEMENT", "PARTIELLEMENT_CONFIRME", "ANNULEE"],
  PARTIELLEMENT_CONFIRME: ["EN_ATTENTE_PAIEMENT", "ANNULEE"],
  EN_ATTENTE_PAIEMENT: ["PAYEE", "EN_PREPARATION", "ECHEC", "ANNULEE"],
  ECHEC: ["EN_ATTENTE_PAIEMENT", "ANNULEE"],
  PAYEE: ["EN_PREPARATION", "REMBOURSEMENT_EN_COURS"],
  EN_PREPARATION: ["PRETE_A_COLLECTER", "EN_LIVRAISON", "REMBOURSEMENT_EN_COURS"],
  PRETE_A_COLLECTER: ["EN_COLLECTE", "EN_LIVRAISON", "REMBOURSEMENT_EN_COURS"],
  EN_COLLECTE: ["EN_LIVRAISON", "REMBOURSEMENT_EN_COURS"],
  EN_LIVRAISON: ["LIVREE", "REMBOURSEMENT_EN_COURS"],
  LIVREE: ["REMBOURSEMENT_EN_COURS"],
  REMBOURSEMENT_EN_COURS: ["REMBOURSEE"],
  REMBOURSEE: [],
  ANNULEE: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return ALLOWED_ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(`Transition de statut interdite : ${from} → ${to}`);
  }
}

/**
 * Retourne l'indice d'étape (0..3) pour le Stepper client 4 étapes :
 * 0 = Panier, 1 = Vérification, 2 = Paiement, 3 = Livraison
 */
export function getOrderStepperIndex(status: OrderStatus): number {
  switch (status) {
    case "BROUILLON":
      return 0;
    case "EN_ATTENTE_CONFIRMATION":
    case "PARTIELLEMENT_CONFIRME":
      return 1;
    case "EN_ATTENTE_PAIEMENT":
    case "ECHEC":
      return 2;
    case "PAYEE":
    case "EN_PREPARATION":
    case "PRETE_A_COLLECTER":
    case "EN_COLLECTE":
    case "EN_LIVRAISON":
    case "LIVREE":
      return 3;
    default:
      return 1;
  }
}
