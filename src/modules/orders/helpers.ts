import crypto from "crypto";
import { OrderItemStatus, SupplierOrderStatus } from "@prisma/client";

/**
 * Construit un numéro de commande lisible et résistant aux collisions concurrentes :
 * FS-AAAA-NNNNN-XXXXXX (6 caractères hex cryptographiques = 16,7M combinaisons par séquence).
 */
export function buildUniqueOrderNumber(year: number, sequenceNumber: number, entropyHex?: string): string {
  const paddedSeq = String(Math.max(1, Math.round(sequenceNumber))).padStart(5, "0");
  const suffix = (entropyHex ?? crypto.randomBytes(3).toString("hex")).toUpperCase();
  return `FS-${year}-${paddedSeq}-${suffix}`;
}

export interface SupplierOrderItemSummaryInput {
  supplierOrderId: string;
  confirmedQty: number;
  lineSupplierTotalXof: number;
  itemStatus: OrderItemStatus;
}

export interface SupplierOrderRecomputed {
  supplierOrderId: string;
  subtotalSupplierXof: number;
  status: SupplierOrderStatus;
}

/**
 * Recalcule le sous-total fournisseur et le statut individuellement pour CHAQUE sous-commande
 * (évite le bug où updateMany copiait le total global dans chaque fournisseur).
 */
export function recomputeSupplierOrdersIndividually(
  items: SupplierOrderItemSummaryInput[]
): SupplierOrderRecomputed[] {
  const grouped = new Map<string, SupplierOrderItemSummaryInput[]>();
  for (const item of items) {
    const list = grouped.get(item.supplierOrderId) ?? [];
    list.push(item);
    grouped.set(item.supplierOrderId, list);
  }

  const results: SupplierOrderRecomputed[] = [];
  for (const [supplierOrderId, group] of grouped.entries()) {
    const subtotalSupplierXof = group.reduce((sum, i) => sum + i.lineSupplierTotalXof, 0);
    const activeItems = group.filter((i) => i.confirmedQty > 0);
    const hasAdjustedOrRejected = group.some(
      (i) => i.itemStatus === OrderItemStatus.ADJUSTED || i.itemStatus === OrderItemStatus.REJECTED
    );

    let status: SupplierOrderStatus;
    if (activeItems.length === 0) {
      status = SupplierOrderStatus.REJECTED;
    } else if (hasAdjustedOrRejected) {
      status = SupplierOrderStatus.ADJUSTED;
    } else {
      status = SupplierOrderStatus.CONFIRMED;
    }

    results.push({ supplierOrderId, subtotalSupplierXof, status });
  }

  return results;
}
