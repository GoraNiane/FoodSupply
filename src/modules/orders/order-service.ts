import {
  DeliveryStatus,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  RoleCode,
  SupplierOrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { generateSecureToken } from "@/lib/auth/password";
import {
  normalizeVolumeTiers,
  resolveOfferPricing,
  resolveVolumeTierUnitPrice,
} from "@/modules/catalog/pricing";
import {
  getPlatformDefaultMargin,
  getPlatformDeliveryRules,
} from "@/modules/catalog/admin-service";
import { computeDeliveryFeeXof } from "@/modules/deliveries/fee-calculator";
import {
  buildUniqueOrderNumber,
  recomputeSupplierOrdersIndividually,
} from "./helpers";
import { assertOrderTransition } from "./state-machine";
import type {
  AdminConfirmOrderInput,
  AdminStatusTransitionInput,
  SubmitOrderInput,
} from "./schemas";
import type { VerifiedSessionUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/permissions/rbac";

export class OrderDomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
      },
    },
  });
  return buildUniqueOrderNumber(year, count + 1);
}

/**
 * Crée une commande (Invité sans inscription OU Restaurant connecté)
 * en recalculant 100 % des prix, marges et frais de livraison côté serveur.
 */
export async function createOrderFromSubmission(params: {
  input: SubmitOrderInput;
  sessionUser: VerifiedSessionUser | null;
}) {
  const { input, sessionUser } = params;

  // Un compte vendeur/administrateur ou fournisseur ne peut jamais commander comme client
  if (
    sessionUser &&
    (sessionUser.roles.includes(RoleCode.ADMIN) ||
      sessionUser.roles.includes(RoleCode.SUPPLIER) ||
      sessionUser.roles.includes(RoleCode.DRIVER))
  ) {
    throw new OrderDomainError(
      "Un compte vendeur/administrateur ne peut pas passer de commande client. Déconnectez-vous d'abord de votre espace pro pour commander.",
      403
    );
  }

  const offerIds = Array.from(new Set(input.items.map((i) => i.offerId)));

  const [defaultMargin, deliveryRules, offers] = await Promise.all([
    getPlatformDefaultMargin(),
    getPlatformDeliveryRules(),
    prisma.supplierOffer.findMany({
      where: {
        id: { in: offerIds },
        isActive: true,
        availability: { not: "OUT_OF_STOCK" },
        product: { isActive: true },
        supplier: { verificationStatus: "APPROVED", isActive: true },
      },
      include: {
        product: { include: { category: true } },
        supplier: true,
      },
    }),
  ]);

  const offersById = new Map(offers.map((o) => [o.id, o]));

  if (offers.length !== offerIds.length) {
    throw new OrderDomainError(
      "Un ou plusieurs produits de votre panier ne sont plus disponibles. Veuillez actualiser votre panier.",
      409
    );
  }

  let subtotalSupplierXof = 0;
  let subtotalClientXof = 0;
  let marginTotalXof = 0;
  let requiresColdChain = false;
  let hasFragileItems = false;

  const computedLines = input.items.map((reqItem) => {
    const offer = offersById.get(reqItem.offerId)!;
    if (reqItem.quantity < offer.minOrderQty) {
      throw new OrderDomainError(
        `Quantité minimale non respectée pour ${offer.product.name} (minimum ${offer.minOrderQty}).`,
        400
      );
    }

    const pricing = resolveOfferPricing(offer.supplierPriceXof, {
      offerMarginType: offer.marginTypeOverride,
      offerMarginValue: offer.marginValueOverride,
      productMarginType: offer.product.marginType,
      productMarginValue: offer.product.marginValue,
      categoryMarginType: offer.product.category.marginType,
      categoryMarginValue: offer.product.category.marginValue,
      defaultMarginType: defaultMargin.marginType,
      defaultMarginValue: defaultMargin.marginValue,
    });

    const volumeTiers = normalizeVolumeTiers(offer.product.volumeTiers);
    const { effectiveUnitPriceXof } = resolveVolumeTierUnitPrice(
      pricing.clientUnitPriceXof,
      reqItem.quantity,
      volumeTiers
    );

    const lineSupplierTotalXof = offer.supplierPriceXof * reqItem.quantity;
    const lineClientTotalXof = effectiveUnitPriceXof * reqItem.quantity;
    const lineMarginXof = lineClientTotalXof - lineSupplierTotalXof;

    subtotalSupplierXof += lineSupplierTotalXof;
    subtotalClientXof += lineClientTotalXof;
    marginTotalXof += lineMarginXof;

    if (offer.product.storageType !== "AMBIENT") requiresColdChain = true;
    if (offer.product.isFragile) hasFragileItems = true;

    return {
      offer,
      quantity: reqItem.quantity,
      pricing: {
        ...pricing,
        clientUnitPriceXof: effectiveUnitPriceXof,
      },
      lineSupplierTotalXof,
      lineClientTotalXof,
      lineMarginXof,
    };
  });

  // Regroupement par fournisseur (1 seul en mode vendeur unique, extensible multi-fournisseurs)
  const supplierGroups = new Map<string, typeof computedLines>();
  for (const line of computedLines) {
    const list = supplierGroups.get(line.offer.supplierId) ?? [];
    list.push(line);
    supplierGroups.set(line.offer.supplierId, list);
  }

  const feeBreakdown = computeDeliveryFeeXof({
    subtotalClientXof,
    supplierCount: supplierGroups.size,
    requiresColdChain,
    hasFragileItems,
    neighborhood: input.neighborhood,
    rules: deliveryRules,
  });

  const totalClientXof = subtotalClientXof + feeBreakdown.totalDeliveryFeeXof;
  const orderNumber = await generateOrderNumber();

  const isGuestOrder = !sessionUser?.restaurantId;
  const guestTokenPair = generateSecureToken(24);

  const displayClientName = input.restaurantName?.trim() || input.contactName;
  const hasGps = typeof input.latitude === "number" && typeof input.longitude === "number";
  const mapsUrl = hasGps
    ? `https://www.google.com/maps?q=${input.latitude},${input.longitude}`
    : null;

  const addressSnapshot = {
    restaurantName: displayClientName,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email || null,
    neighborhood: input.neighborhood,
    street: input.street,
    city: "Dakar",
    landmark: input.landmark || null,
    deliverySlot: input.deliverySlot,
    matchedZoneLabel: feeBreakdown.matchedZoneLabel,
    latitude: hasGps ? input.latitude : null,
    longitude: hasGps ? input.longitude : null,
    mapsUrl,
  };

  const executeOrderCreation = async (candidateOrderNumber: string) =>
    prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: candidateOrderNumber,
          restaurantId: sessionUser?.restaurantId ?? null,
          isGuestOrder,
          guestRestaurantName: displayClientName,
          guestContactName: input.contactName,
          guestPhone: input.phone,
          guestEmail: input.email || null,
          guestTrackingTokenHash: guestTokenPair.tokenHash,
          deliverySlot: input.deliverySlot,
          deliveryAddressSnapshot: addressSnapshot,
          status: OrderStatus.EN_ATTENTE_CONFIRMATION,
          currency: "XOF",
          subtotalSupplierXof,
          subtotalClientXof,
          marginTotalXof,
          deliveryFeeXof: feeBreakdown.totalDeliveryFeeXof,
          totalClientXof,
          requiresClientApproval: false,
          notes: input.notes || null,
        },
      });

      let supIndex = 1;
      for (const [supplierId, lines] of supplierGroups.entries()) {
        const subTotalSupplier = lines.reduce((acc, l) => acc + l.lineSupplierTotalXof, 0);
        const supplierOrder = await tx.supplierOrder.create({
          data: {
            reference: `${candidateOrderNumber}-S${supIndex++}`,
            orderId: order.id,
            supplierId,
            status: SupplierOrderStatus.PENDING_CONFIRMATION,
            subtotalSupplierXof: subTotalSupplier,
          },
        });

        for (const line of lines) {
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              supplierOrderId: supplierOrder.id,
              productId: line.offer.productId,
              supplierOfferId: line.offer.id,
              productNameSnapshot: line.offer.product.name,
              unitLabelSnapshot: line.offer.product.unitLabel,
              storageTypeSnapshot: line.offer.product.storageType,
              isFragileSnapshot: line.offer.product.isFragile,
              requestedQty: line.quantity,
              requestedSupplierPriceXof: line.offer.supplierPriceXof,
              marginTypeSnapshot: line.pricing.marginType,
              marginValueSnapshot: line.pricing.marginValue,
              clientUnitPriceXof: line.pricing.clientUnitPriceXof,
              lineSupplierTotalXof: line.lineSupplierTotalXof,
              lineClientTotalXof: line.lineClientTotalXof,
              lineMarginXof: line.lineMarginXof,
              itemStatus: OrderItemStatus.PENDING,
            },
          });

          await tx.supplierOrderItem.create({
            data: {
              supplierOrderId: supplierOrder.id,
              orderItemId: orderItem.id,
              productId: line.offer.productId,
              supplierOfferId: line.offer.id,
              productNameSnapshot: line.offer.product.name,
              unitLabelSnapshot: line.offer.product.unitLabel,
              requestedQty: line.quantity,
              requestedSupplierPriceXof: line.offer.supplierPriceXof,
              lineSupplierTotalXof: line.lineSupplierTotalXof,
              itemStatus: OrderItemStatus.PENDING,
            },
          });
        }
      }

      await tx.delivery.create({
        data: {
          orderId: order.id,
          status: DeliveryStatus.PENDING_ASSIGNMENT,
          requiresColdChain,
          hasFragileItems,
          pickupCount: supplierGroups.size,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.BROUILLON,
          toStatus: OrderStatus.EN_ATTENTE_CONFIRMATION,
          changedById: sessionUser?.id ?? null,
          reason: isGuestOrder
            ? "Demande de commande soumise sans inscription (Invité)"
            : "Demande de commande soumise par le restaurant",
        },
      });

      // Notifier les administrateurs
      const admins = await tx.user.findMany({
        where: {
          status: "ACTIVE",
          roles: { some: { role: { code: RoleCode.ADMIN } } },
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "NEW_ORDER",
            title: `Nouvelle commande ${candidateOrderNumber}`,
            message: `${displayClientName} (${input.neighborhood}) — ${totalClientXof} FCFA à confirmer.`,
            linkUrl: `/admin/commandes/${order.id}`,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: sessionUser?.id ?? null,
          action: isGuestOrder ? "GUEST_ORDER_SUBMITTED" : "ORDER_SUBMITTED",
          entityType: "Order",
          entityId: order.id,
          afterJson: {
            orderNumber: candidateOrderNumber,
            totalClientXof,
            itemCount: computedLines.length,
            restaurantName: displayClientName,
          },
        },
      });

      return order;
    });

  // Retry automatique anti-collision P2002 sur le numéro de commande
  let created = null;
  let candidate = orderNumber;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      created = await executeOrderCreation(candidate);
      break;
    } catch (err) {
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueViolation || attempt === 2) {
        throw err;
      }
      candidate = await generateOrderNumber();
    }
  }
  if (!created) {
    throw new OrderDomainError("Impossible de générer une référence unique de commande.", 500);
  }

  return {
    orderId: created.id,
    orderNumber: created.orderNumber,
    status: created.status,
    totalClientXof: created.totalClientXof,
    trackingToken: guestTokenPair.rawToken,
    trackingUrl: `/suivi/${created.orderNumber}?token=${guestTokenPair.rawToken}`,
  };
}

/**
 * Confirmation / Ajustement des quantités et prix par l'Admin (vendeur unique) avant paiement.
 */
export async function adminConfirmOrder(params: {
  orderId: string;
  input: AdminConfirmOrderInput;
  adminUser: VerifiedSessionUser;
}) {
  const { orderId, input, adminUser } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      supplierOrders: true,
      restaurant: { select: { userId: true } },
    },
  });

  if (!order) {
    throw new OrderDomainError("Commande introuvable.", 404);
  }

  if (
    order.status !== OrderStatus.EN_ATTENTE_CONFIRMATION &&
    order.status !== OrderStatus.PARTIELLEMENT_CONFIRME
  ) {
    throw new OrderDomainError(
      "Cette commande ne peut plus être confirmée dans son statut actuel.",
      409
    );
  }

  const updatesByItemId = new Map(input.items.map((i) => [i.orderItemId, i]));

  let hasAnyChange = false;
  let confirmedItemsCount = 0;
  let newSubtotalSupplierXof = 0;
  let newSubtotalClientXof = 0;
  let newMarginTotalXof = 0;

  const itemCalculations = order.items.map((item) => {
    const upd = updatesByItemId.get(item.id);
    const confirmedQty = upd ? upd.confirmedQty : item.requestedQty;
    const confirmedClientPrice = upd ? upd.confirmedClientUnitPriceXof : item.clientUnitPriceXof;
    const confirmedSupplierPrice =
      upd?.confirmedSupplierUnitPriceXof ?? item.requestedSupplierPriceXof;

    let itemStatus: OrderItemStatus = OrderItemStatus.CONFIRMED;
    if (confirmedQty === 0) {
      itemStatus = OrderItemStatus.REJECTED;
      hasAnyChange = true;
    } else {
      confirmedItemsCount += 1;
      if (
        confirmedQty !== item.requestedQty ||
        confirmedClientPrice !== item.clientUnitPriceXof
      ) {
        itemStatus = OrderItemStatus.ADJUSTED;
        hasAnyChange = true;
      }
    }

    const lineSupplierTotalXof = confirmedSupplierPrice * confirmedQty;
    const lineClientTotalXof = confirmedClientPrice * confirmedQty;
    const lineMarginXof = lineClientTotalXof - lineSupplierTotalXof;

    newSubtotalSupplierXof += lineSupplierTotalXof;
    newSubtotalClientXof += lineClientTotalXof;
    newMarginTotalXof += lineMarginXof;

    return {
      item,
      confirmedQty,
      confirmedSupplierPrice,
      confirmedClientPrice,
      lineSupplierTotalXof,
      lineClientTotalXof,
      lineMarginXof,
      itemStatus,
    };
  });

  const nextDeliveryFeeXof =
    input.deliveryFeeXof !== undefined ? input.deliveryFeeXof : order.deliveryFeeXof;
  if (nextDeliveryFeeXof !== order.deliveryFeeXof) {
    hasAnyChange = true;
  }

  const newTotalClientXof = newSubtotalClientXof + nextDeliveryFeeXof;

  let nextStatus: OrderStatus;
  let requiresClientApproval = false;

  if (confirmedItemsCount === 0) {
    nextStatus = OrderStatus.ANNULEE;
  } else if (hasAnyChange) {
    nextStatus = OrderStatus.PARTIELLEMENT_CONFIRME;
    requiresClientApproval = true;
  } else {
    nextStatus = OrderStatus.EN_ATTENTE_PAIEMENT;
    requiresClientApproval = false;
  }

  assertOrderTransition(order.status, nextStatus);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    for (const calc of itemCalculations) {
      await tx.orderItem.update({
        where: { id: calc.item.id },
        data: {
          confirmedQty: calc.confirmedQty,
          confirmedSupplierPriceXof: calc.confirmedSupplierPrice,
          clientUnitPriceXof: calc.confirmedClientPrice,
          lineSupplierTotalXof: calc.lineSupplierTotalXof,
          lineClientTotalXof: calc.lineClientTotalXof,
          lineMarginXof: calc.lineMarginXof,
          itemStatus: calc.itemStatus,
        },
      });

      await tx.supplierOrderItem.updateMany({
        where: { orderItemId: calc.item.id },
        data: {
          confirmedQty: calc.confirmedQty,
          confirmedSupplierPriceXof: calc.confirmedSupplierPrice,
          lineSupplierTotalXof: calc.lineSupplierTotalXof,
          itemStatus: calc.itemStatus,
        },
      });
    }

    // Recalcul individuel exact par sous-commande fournisseur (multi-fournisseurs safe)
    const perSupplierUpdates = recomputeSupplierOrdersIndividually(
      itemCalculations.map((calc) => ({
        supplierOrderId: calc.item.supplierOrderId,
        confirmedQty: calc.confirmedQty,
        lineSupplierTotalXof: calc.lineSupplierTotalXof,
        itemStatus: calc.itemStatus,
      }))
    );

    for (const supUpd of perSupplierUpdates) {
      await tx.supplierOrder.update({
        where: { id: supUpd.supplierOrderId },
        data: {
          status: supUpd.status,
          subtotalSupplierXof: supUpd.subtotalSupplierXof,
          confirmedAt: new Date(),
          supplierNote: input.adminNote || null,
        },
      });
    }

    const saved = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        subtotalSupplierXof: newSubtotalSupplierXof,
        subtotalClientXof: newSubtotalClientXof,
        marginTotalXof: newMarginTotalXof,
        deliveryFeeXof: nextDeliveryFeeXof,
        totalClientXof: newTotalClientXof,
        requiresClientApproval,
        clientApprovedAt: requiresClientApproval ? null : new Date(),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: nextStatus,
        changedById: adminUser.id,
        reason:
          input.adminNote ||
          (nextStatus === OrderStatus.PARTIELLEMENT_CONFIRME
            ? "Stocks/prix ajustés par FoodSupply — en attente d'acceptation client"
            : nextStatus === OrderStatus.EN_ATTENTE_PAIEMENT
              ? "Commande confirmée à 100 % par FoodSupply — prête au paiement"
              : "Tous les articles indisponibles — commande annulée"),
      },
    });

    if (order.restaurant?.userId) {
      await tx.notification.create({
        data: {
          userId: order.restaurant.userId,
          type: "ORDER_CONFIRMED",
          title:
            nextStatus === OrderStatus.PARTIELLEMENT_CONFIRME
              ? `Proposition révisée pour ${order.orderNumber}`
              : `Commande ${order.orderNumber} confirmée`,
          message:
            nextStatus === OrderStatus.PARTIELLEMENT_CONFIRME
              ? "Certaines quantités ou tarifs ont été ajustés. Validez la proposition avant paiement."
              : `Montant définitif : ${newTotalClientXof} FCFA. Vous pouvez procéder au paiement.`,
          linkUrl: `/suivi/${order.orderNumber}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: "ADMIN_ORDER_CONFIRMED",
        entityType: "Order",
        entityId: order.id,
        beforeJson: { status: order.status, totalClientXof: order.totalClientXof },
        afterJson: { status: nextStatus, totalClientXof: newTotalClientXof, hasAnyChange },
      },
    });

    return saved;
  });

  return updatedOrder;
}

/**
 * Décision du client (Invité avec jeton OU Restaurant connecté) sur une proposition ajustée.
 */
export async function clientRespondToRevision(params: {
  orderNumber: string;
  decision: "ACCEPT" | "REJECT";
  reason?: string;
  guestToken?: string | null;
  sessionUser: VerifiedSessionUser | null;
}) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { delivery: { select: { driverId: true } } },
  });

  if (!order) {
    throw new OrderDomainError("Commande introuvable.", 404);
  }

  const allowed = canAccessOrder({
    order: {
      restaurantId: order.restaurantId,
      isGuestOrder: order.isGuestOrder,
      guestTrackingTokenHash: order.guestTrackingTokenHash,
      assignedDriverId: order.delivery?.driverId ?? null,
    },
    actor: params.sessionUser,
    guestToken: params.guestToken,
  });

  if (!allowed) {
    throw new OrderDomainError("Accès non autorisé à cette commande.", 403);
  }

  if (order.status !== OrderStatus.PARTIELLEMENT_CONFIRME) {
    throw new OrderDomainError("Aucune proposition révisée en attente de validation.", 409);
  }

  const nextStatus =
    params.decision === "ACCEPT" ? OrderStatus.EN_ATTENTE_PAIEMENT : OrderStatus.ANNULEE;

  assertOrderTransition(order.status, nextStatus);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        requiresClientApproval: false,
        clientApprovedAt: params.decision === "ACCEPT" ? new Date() : null,
        cancelledReason: params.decision === "REJECT" ? params.reason || "Refusé par le client" : null,
        cancelledById: params.decision === "REJECT" ? params.sessionUser?.id ?? null : null,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: nextStatus,
        changedById: params.sessionUser?.id ?? null,
        reason:
          params.decision === "ACCEPT"
            ? "Proposition révisée acceptée par le client — prêt au paiement"
            : params.reason || "Proposition révisée refusée par le client",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: params.sessionUser?.id ?? null,
        action:
          params.decision === "ACCEPT" ? "CLIENT_ACCEPTED_REVISION" : "CLIENT_REJECTED_REVISION",
        entityType: "Order",
        entityId: order.id,
        afterJson: { nextStatus, totalClientXof: order.totalClientXof },
      },
    });

    return updated;
  });
}

/**
 * Avancement du cycle de vie logistique / livraison par l'Admin (livreurs gérés hors-app).
 */
export async function adminTransitionOrderStatus(params: {
  orderId: string;
  input: AdminStatusTransitionInput;
  adminUser: VerifiedSessionUser;
}) {
  const { orderId, input, adminUser } = params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { delivery: true },
  });

  if (!order) {
    throw new OrderDomainError("Commande introuvable.", 404);
  }

  assertOrderTransition(order.status, input.nextStatus);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === OrderStatus.ANNULEE
          ? {
            cancelledReason: input.reason || "Annulée par l'administration",
            cancelledById: adminUser.id,
          }
          : {}),
      },
    });

    // Mise à jour synchronisée du suivi livraison hors-app
    if (order.delivery) {
      let nextDeliveryStatus = order.delivery.status;
      if (input.nextStatus === OrderStatus.EN_LIVRAISON) {
        nextDeliveryStatus = DeliveryStatus.IN_TRANSIT;
      } else if (input.nextStatus === OrderStatus.LIVREE) {
        nextDeliveryStatus = DeliveryStatus.DELIVERED;
      } else if (input.nextStatus === OrderStatus.ANNULEE) {
        nextDeliveryStatus = DeliveryStatus.CANCELLED;
      }

      await tx.delivery.update({
        where: { id: order.delivery.id },
        data: {
          status: nextDeliveryStatus,
          ...(input.externalDriverName ? { externalDriverName: input.externalDriverName } : {}),
          ...(input.externalDriverPhone ? { externalDriverPhone: input.externalDriverPhone } : {}),
          ...(input.nextStatus === OrderStatus.EN_LIVRAISON && !order.delivery.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...(input.nextStatus === OrderStatus.LIVREE ? { deliveredAt: new Date() } : {}),
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.nextStatus,
        changedById: adminUser.id,
        reason: input.reason || `Statut mis à jour vers ${input.nextStatus}`,
        metadata:
          input.externalDriverName || input.externalDriverPhone
            ? {
              externalDriverName: input.externalDriverName || null,
              externalDriverPhone: input.externalDriverPhone || null,
            }
            : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: "ORDER_STATUS_UPDATED",
        entityType: "Order",
        entityId: order.id,
        beforeJson: { status: order.status },
        afterJson: {
          status: input.nextStatus,
          externalDriverName: input.externalDriverName || null,
        },
      },
    });

    return updated;
  });
}
