import crypto from "crypto";
import type {
  InvoicePaymentStatus,
  PaymentMethod,
  PaymentProviderCode,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type { VerifiedSessionUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/permissions/rbac";
import { canTransitionOrderStatus } from "@/modules/orders/state-machine";
import { buildWavePaymentUrl, verifyWebhookHmacSignature } from "@/modules/payments/wave";
import { getCompanyProfile, getPaymentConfig } from "@/modules/payments/settings";
import type {
  AdminConfirmPaymentInput,
  AdminFailPaymentInput,
  AdminRefundPaymentInput,
  InitiatePaymentInput,
} from "@/modules/payments/schemas";

export class PaymentDomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PaymentDomainError";
    this.statusCode = statusCode;
  }
}

function buildPaymentReference(prefix: "PAY" | "REF"): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count();
  const seq = String(count + 1).padStart(5, "0");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FAC-${year}-${seq}-${suffix}`;
}

function mapMethodToProvider(method: PaymentMethod): PaymentProviderCode {
  switch (method) {
    case "WAVE":
      return "WAVE";
    case "ORANGE_MONEY":
      return "ORANGE_MONEY";
    case "CARD":
      return "CARD_GATEWAY";
    case "BANK_TRANSFER":
    case "CASH_ON_DELIVERY":
      return "BANK_TRANSFER";
  }
}

/**
 * Crée ou met à jour la facture client associée à la commande (immuable côté client, zéro info fournisseur).
 */
export async function ensureInvoiceForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  paymentStatus: InvoicePaymentStatus,
  paymentMethodLabel?: string
) {
  const existing = await tx.invoice.findUnique({ where: { orderId } });
  if (existing) {
    if (existing.paymentStatus !== paymentStatus) {
      return tx.invoice.update({
        where: { id: existing.id },
        data: { paymentStatus },
      });
    }
    return existing;
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    throw new PaymentDomainError("Commande introuvable pour la facturation.", 404);
  }

  const company = await getCompanyProfile();
  const invoiceNumber = await generateInvoiceNumber(tx);

  // Snapshot strictement client (aucune donnée fournisseur, coût d'achat ou marge)
  const snapshotJson = {
    company,
    orderNumber: order.orderNumber,
    orderCreatedAt: order.createdAt.toISOString(),
    paymentMethod: paymentMethodLabel ?? "Wave",
    deliverySlot: order.deliverySlot ?? null,
    clientAddress: order.deliveryAddressSnapshot,
    items: order.items
      .filter((item) => (item.confirmedQty ?? item.requestedQty) > 0)
      .map((item) => ({
        productName: item.productNameSnapshot,
        unitLabel: item.unitLabelSnapshot,
        quantity: item.confirmedQty ?? item.requestedQty,
        unitPriceXof: item.clientUnitPriceXof,
        lineTotalXof: item.lineClientTotalXof,
      })),
  };

  return tx.invoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      restaurantId: order.restaurantId,
      subtotalClientXof: order.subtotalClientXof,
      deliveryFeeXof: order.deliveryFeeXof,
      totalClientXof: order.totalClientXof,
      currency: order.currency,
      paymentStatus,
      snapshotJson: snapshotJson as unknown as Prisma.InputJsonValue,
    },
  });
}

async function notifyAdmins(params: {
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        roles: { some: { role: { code: "ADMIN" } } },
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: params.type,
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      })),
    });
  } catch {
    // Non bloquant
  }
}

/**
 * Enregistre une intention ou une déclaration de paiement Wave / à la livraison par le client.
 * NE marque JAMAIS la commande PAYEE automatiquement : l'Admin vérifie l'encaissement réel Wave.
 */
export async function initiateOrDeclareOrderPayment(params: {
  input: InitiatePaymentInput;
  actor: VerifiedSessionUser | null;
}) {
  const { input, actor } = params;

  const order = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
    include: {
      delivery: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    throw new PaymentDomainError("Commande introuvable.", 404);
  }

  const allowed = canAccessOrder({
    order: {
      restaurantId: order.restaurantId,
      isGuestOrder: order.isGuestOrder,
      guestTrackingTokenHash: order.guestTrackingTokenHash,
      assignedDriverId: order.delivery?.driverId ?? null,
    },
    actor,
    guestToken: input.guestToken ?? null,
  });

  if (!allowed) {
    throw new PaymentDomainError("Accès refusé à cette commande.", 403);
  }

  if (order.status !== "EN_ATTENTE_PAIEMENT" && order.status !== "ECHEC") {
    throw new PaymentDomainError(
      "Le paiement n'est disponible qu'une fois la commande confirmée par FoodSupply.",
      409
    );
  }

  const alreadyPaid = order.payments.find((p) => p.status === "SUCCEEDED");
  if (alreadyPaid) {
    throw new PaymentDomainError("Cette commande a déjà été réglée.", 409);
  }

  const config = await getPaymentConfig();

  if (input.method === "CASH_ON_DELIVERY" && !config.allowCashOnDelivery) {
    throw new PaymentDomainError("Le paiement à la livraison est actuellement désactivé.", 400);
  }
  if (input.method === "ORANGE_MONEY" && !config.allowOrangeMoney) {
    throw new PaymentDomainError("Le paiement Orange Money est actuellement désactivé.", 400);
  }

  const waveUrl =
    input.method === "WAVE"
      ? buildWavePaymentUrl(order.totalClientXof, config.waveMerchantBaseUrl)
      : null;

  const existingPending = order.payments.find(
    (p) => (p.status === "PENDING" || p.status === "INITIATED") && p.method === input.method
  );

  const metadataPayload = {
    clientDeclaredPaid: Boolean(input.clientDeclaredPaid),
    clientDeclarationRef: input.clientDeclarationRef ?? null,
    payerPhone: input.payerPhone ?? null,
    declaredAt: input.clientDeclaredPaid ? new Date().toISOString() : null,
  };

  let payment;
  if (existingPending) {
    const prevMeta = (existingPending.metadata ?? {}) as Record<string, unknown>;
    payment = await prisma.payment.update({
      where: { id: existingPending.id },
      data: {
        amountXof: order.totalClientXof,
        checkoutUrl: waveUrl,
        status: "PENDING",
        metadata: {
          ...prevMeta,
          ...(input.clientDeclaredPaid ? metadataPayload : {}),
          lastClickedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        reference: buildPaymentReference("PAY"),
        provider: mapMethodToProvider(input.method),
        method: input.method,
        isSandbox: false,
        amountXof: order.totalClientXof,
        currency: order.currency,
        status: "PENDING",
        idempotencyKey: `pay_${order.id}_${input.method}_${crypto.randomBytes(6).toString("hex")}`,
        checkoutUrl: waveUrl,
        metadata: metadataPayload as Prisma.InputJsonValue,
      },
    });
  }

  if (input.clientDeclaredPaid || input.method === "CASH_ON_DELIVERY") {
    const methodLabel =
      input.method === "WAVE"
        ? "Wave"
        : input.method === "ORANGE_MONEY"
          ? "Orange Money"
          : "Paiement à la livraison";
    await notifyAdmins({
      type:
        input.method === "WAVE"
          ? "WAVE_PAYMENT_DECLARED"
          : input.method === "ORANGE_MONEY"
            ? "OM_PAYMENT_DECLARED"
            : "COD_PAYMENT_SELECTED",
      title:
        input.method === "CASH_ON_DELIVERY"
          ? `Paiement à la livraison choisi — ${order.orderNumber}`
          : `Paiement ${methodLabel} signalé — ${order.orderNumber}`,
      message:
        input.method === "CASH_ON_DELIVERY"
          ? `Le client souhaite régler ${order.totalClientXof} FCFA à la livraison.`
          : `Le client a signalé un règlement ${methodLabel} de ${order.totalClientXof} FCFA${
              input.clientDeclarationRef ? ` (Réf : ${input.clientDeclarationRef})` : ""
            }. Vérifiez votre compte ${methodLabel} puis validez le paiement.`,
      linkUrl: `/admin/commandes/${order.id}`,
      metadata: { orderId: order.id, paymentId: payment.id, method: input.method },
    });
  }

  return {
    paymentId: payment.id,
    reference: payment.reference,
    method: payment.method,
    status: payment.status,
    amountXof: payment.amountXof,
    waveUrl,
  };
}

/**
 * Confirmation manuelle par l'Administrateur après vérification de l'encaissement Wave / espèces.
 * Atomique : Payment -> SUCCEEDED, Order -> PAYEE, création Facture FAC-YYYY-NNNNN, AuditLog.
 */
export async function adminConfirmOrderPayment(params: {
  input: AdminConfirmPaymentInput;
  adminUser: VerifiedSessionUser;
}) {
  const { input, adminUser } = params;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      throw new PaymentDomainError("Commande introuvable.", 404);
    }

    const existingSucceeded = order.payments.find((p) => p.status === "SUCCEEDED");
    if (existingSucceeded) {
      throw new PaymentDomainError("Un paiement validé existe déjà pour cette commande.", 409);
    }

    if (!canTransitionOrderStatus(order.status, "PAYEE")) {
      throw new PaymentDomainError(
        `Impossible de valider le paiement depuis le statut ${order.status}.`,
        409
      );
    }

    const targetPayment = input.paymentId
      ? order.payments.find((p) => p.id === input.paymentId)
      : order.payments.find((p) => p.status === "PENDING" || p.status === "INITIATED");

    const finalMethod: PaymentMethod = input.method ?? targetPayment?.method ?? "WAVE";
    const now = new Date();

    const payment = targetPayment
      ? await tx.payment.update({
          where: { id: targetPayment.id },
          data: {
            method: finalMethod,
            provider: mapMethodToProvider(finalMethod),
            status: "SUCCEEDED",
            amountXof: order.totalClientXof,
            paidAt: now,
            providerTransactionId: input.providerTransactionId || targetPayment.providerTransactionId,
            metadata: {
              ...((targetPayment.metadata ?? {}) as Record<string, unknown>),
              confirmedByAdminId: adminUser.id,
              adminNote: input.note ?? null,
            } as Prisma.InputJsonValue,
          },
        })
      : await tx.payment.create({
          data: {
            orderId: order.id,
            reference: buildPaymentReference("PAY"),
            provider: mapMethodToProvider(finalMethod),
            method: finalMethod,
            isSandbox: false,
            amountXof: order.totalClientXof,
            currency: order.currency,
            status: "SUCCEEDED",
            idempotencyKey: `admin_confirm_${order.id}_${crypto.randomBytes(6).toString("hex")}`,
            providerTransactionId: input.providerTransactionId || null,
            paidAt: now,
            metadata: {
              confirmedByAdminId: adminUser.id,
              adminNote: input.note ?? null,
            } as Prisma.InputJsonValue,
          },
        });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAYEE" },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "PAYEE",
        changedById: adminUser.id,
        reason:
          input.note?.trim() ||
          `Paiement ${finalMethod === "WAVE" ? "Wave" : finalMethod} confirmé par FoodSupply${
            input.providerTransactionId ? ` (Réf : ${input.providerTransactionId})` : ""
          }.`,
      },
    });

    const methodLabels: Record<PaymentMethod, string> = {
      WAVE: "Wave Sénégal",
      ORANGE_MONEY: "Orange Money",
      CARD: "Carte bancaire",
      BANK_TRANSFER: "Virement bancaire",
      CASH_ON_DELIVERY: "Paiement à la livraison",
    };

    const invoice = await ensureInvoiceForOrder(tx, order.id, "PAID", methodLabels[finalMethod]);

    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: "PAYMENT_CONFIRMED_BY_ADMIN",
        entityType: "Payment",
        entityId: payment.id,
        afterJson: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountXof: payment.amountXof,
          method: finalMethod,
          providerTransactionId: input.providerTransactionId ?? null,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });

    return { payment, invoice };
  });
}

export async function adminMarkPaymentFailed(params: {
  paymentId: string;
  input: AdminFailPaymentInput;
  adminUser: VerifiedSessionUser;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: params.paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new PaymentDomainError("Paiement introuvable.", 404);
    }
    if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") {
      throw new PaymentDomainError("Impossible de marquer échoué un paiement déjà encaissé.", 409);
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedReason: params.input.reason,
      },
    });

    if (canTransitionOrderStatus(payment.order.status, "ECHEC")) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "ECHEC" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: "ECHEC",
          changedById: params.adminUser.id,
          reason: params.input.reason,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: params.adminUser.id,
        action: "PAYMENT_MARKED_FAILED",
        entityType: "Payment",
        entityId: payment.id,
        afterJson: { reason: params.input.reason },
      },
    });

    return updated;
  });
}

export async function adminRefundPayment(params: {
  paymentId: string;
  input: AdminRefundPaymentInput;
  adminUser: VerifiedSessionUser;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: params.paymentId },
      include: { order: true, refunds: true },
    });

    if (!payment) {
      throw new PaymentDomainError("Paiement introuvable.", 404);
    }
    if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new PaymentDomainError("Seul un paiement encaissé peut être remboursé.", 409);
    }

    const alreadyRefunded = payment.refunds
      .filter((r) => r.status === "SUCCEEDED")
      .reduce((sum, r) => sum + r.amountXof, 0);
    const remaining = payment.amountXof - alreadyRefunded;
    const refundAmount = params.input.amountXof ?? remaining;

    if (refundAmount <= 0 || refundAmount > remaining) {
      throw new PaymentDomainError(
        `Montant de remboursement invalide (maximum disponible : ${remaining} FCFA).`,
        400
      );
    }

    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        reference: buildPaymentReference("REF"),
        amountXof: refundAmount,
        reason: params.input.reason,
        status: "SUCCEEDED",
        initiatedById: params.adminUser.id,
        processedAt: new Date(),
      },
    });

    const isFullRefund = alreadyRefunded + refundAmount >= payment.amountXof;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });

    if (isFullRefund && canTransitionOrderStatus(payment.order.status, "REMBOURSEMENT_EN_COURS")) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "REMBOURSEE" },
      });
      await tx.orderStatusHistory.createMany({
        data: [
          {
            orderId: payment.orderId,
            fromStatus: payment.order.status,
            toStatus: "REMBOURSEMENT_EN_COURS",
            changedById: params.adminUser.id,
            reason: params.input.reason,
          },
          {
            orderId: payment.orderId,
            fromStatus: "REMBOURSEMENT_EN_COURS",
            toStatus: "REMBOURSEE",
            changedById: params.adminUser.id,
            reason: `Remboursement intégral effectué (${refundAmount} FCFA).`,
          },
        ],
      });

      await tx.invoice.updateMany({
        where: { orderId: payment.orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: params.adminUser.id,
        action: "PAYMENT_REFUNDED",
        entityType: "Refund",
        entityId: refund.id,
        afterJson: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amountXof: refundAmount,
          isFullRefund,
          reason: params.input.reason,
        },
      },
    });

    return refund;
  });
}

/**
 * Webhook idempotent prêt pour une future intégration Wave Business / PSP automatisé.
 */
export async function processPaymentWebhook(params: {
  provider: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  if (!secret) {
    throw new PaymentDomainError("Webhook non configuré côté serveur.", 503);
  }

  const valid = verifyWebhookHmacSignature({
    rawBody: params.rawBody,
    signatureHeader: params.signatureHeader,
    secret,
  });

  if (!valid) {
    throw new PaymentDomainError("Signature webhook invalide.", 401);
  }

  let parsed: {
    eventId?: string;
    eventType?: string;
    paymentReference?: string;
    providerTransactionId?: string;
  };
  try {
    parsed = JSON.parse(params.rawBody);
  } catch {
    throw new PaymentDomainError("Payload JSON invalide.", 400);
  }

  if (!parsed.eventId || !parsed.eventType || !parsed.paymentReference) {
    throw new PaymentDomainError("Champs webhook obligatoires manquants.", 400);
  }

  // Idempotence stricte sur providerEventId
  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { providerEventId: parsed.eventId },
  });
  if (existingEvent) {
    return { duplicate: true, processed: true };
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference: parsed.paymentReference! },
      include: { order: true },
    });

    if (!payment) {
      throw new PaymentDomainError("Référence de paiement introuvable.", 404);
    }

    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: parsed.eventId!,
        eventType: parsed.eventType!,
        payload: parsed as Prisma.InputJsonValue,
        signatureValid: true,
        processedAt: new Date(),
      },
    });

    if (parsed.eventType === "payment.succeeded" && payment.status !== "SUCCEEDED") {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          paidAt: new Date(),
          providerTransactionId: parsed.providerTransactionId ?? payment.providerTransactionId,
        },
      });

      if (canTransitionOrderStatus(payment.order.status, "PAYEE")) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "PAYEE" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: payment.order.status,
            toStatus: "PAYEE",
            reason: `Paiement confirmé automatiquement par webhook (${params.provider}).`,
          },
        });
      }

      await ensureInvoiceForOrder(tx, payment.orderId, "PAID", "Wave Sénégal");
    }

    return { duplicate: false, processed: true };
  });
}

/**
 * Calcule l'encours crédit Pro actuellement utilisé (commandes crédit avec facture impayée).
 */
export async function getRestaurantUsedCreditXof(restaurantId: string): Promise<number> {
  const unpaidCreditOrders = await prisma.order.aggregate({
    where: {
      restaurantId,
      isCreditOrder: true,
      status: { notIn: ["ANNULEE", "REMBOURSEE"] },
      OR: [{ invoice: { is: null } }, { invoice: { paymentStatus: "UNPAID" } }],
    },
    _sum: { totalClientXof: true },
  });
  return unpaidCreditOrders._sum.totalClientXof ?? 0;
}

/**
 * Permet à un client Restaurant validé en Crédit Pro (J+7/J+15/J+30) de lancer sa commande
 * immédiatement sur son plafond autorisé, avec facture émise en statut UNPAID et date d'échéance.
 */
export async function confirmOrderOnCreditPro(params: {
  orderNumber: string;
  actor: VerifiedSessionUser;
}) {
  if (!params.actor.restaurantId) {
    throw new PaymentDomainError(
      "Le Crédit Pro est réservé aux comptes professionnels approuvés par FoodSupply.",
      403
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.actor.restaurantId },
  });
  if (!restaurant || !restaurant.creditEnabled || restaurant.creditLimitXof <= 0) {
    throw new PaymentDomainError(
      "Votre compte n'a pas encore de ligne Crédit Pro active. Contactez FoodSupply Dakar.",
      403
    );
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: { payments: true },
    });

    if (!order || order.restaurantId !== restaurant.id) {
      throw new PaymentDomainError("Commande introuvable.", 404);
    }
    if (order.status !== "EN_ATTENTE_PAIEMENT" && order.status !== "ECHEC") {
      throw new PaymentDomainError("Cette commande n'est pas en attente de règlement.", 409);
    }

    const usedAgg = await tx.order.aggregate({
      where: {
        restaurantId: restaurant.id,
        isCreditOrder: true,
        status: { notIn: ["ANNULEE", "REMBOURSEE"] },
        OR: [{ invoice: { is: null } }, { invoice: { paymentStatus: "UNPAID" } }],
      },
      _sum: { totalClientXof: true },
    });
    const usedCreditXof = usedAgg._sum.totalClientXof ?? 0;
    const remainingXof = restaurant.creditLimitXof - usedCreditXof;

    if (order.totalClientXof > remainingXof) {
      throw new PaymentDomainError(
        `Plafond Crédit Pro insuffisant (disponible : ${Math.max(0, remainingXof)} FCFA). Réglez vos factures en cours ou payez cette commande par Wave.`,
        409
      );
    }

    const dueAt = new Date(Date.now() + Math.max(1, restaurant.creditTermDays) * 86_400_000);

    await tx.order.update({
      where: { id: order.id },
      data: {
        isCreditOrder: true,
        paymentDueAt: dueAt,
        status: "EN_PREPARATION",
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "EN_PREPARATION",
        changedById: params.actor.id,
        reason: `Validée sur ligne Crédit Pro B2B (J+${restaurant.creditTermDays}, échéance ${dueAt.toISOString().slice(0, 10)}).`,
      },
    });

    const invoice = await ensureInvoiceForOrder(
      tx,
      order.id,
      "UNPAID",
      `Crédit Pro B2B (J+${restaurant.creditTermDays})`
    );

    await tx.auditLog.create({
      data: {
        actorUserId: params.actor.id,
        action: "ORDER_CONFIRMED_ON_CREDIT_PRO",
        entityType: "Order",
        entityId: order.id,
        afterJson: {
          orderNumber: order.orderNumber,
          amountXof: order.totalClientXof,
          creditTermDays: restaurant.creditTermDays,
          paymentDueAt: dueAt.toISOString(),
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });

    return { orderId: order.id, dueAt, invoiceNumber: invoice.invoiceNumber };
  });
}

/**
 * Encaissement ultérieur d'une commande passée en Crédit Pro (J+7/J+15),
 * sans régresser le statut logistique (ex. commande déjà LIVREE).
 */
export async function adminSettleCreditOrder(params: {
  orderId: string;
  method: PaymentMethod;
  providerTransactionId?: string;
  note?: string;
  adminUser: VerifiedSessionUser;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: params.orderId },
      include: { payments: true, invoice: true },
    });

    if (!order) {
      throw new PaymentDomainError("Commande introuvable.", 404);
    }
    if (!order.isCreditOrder) {
      throw new PaymentDomainError("Cette commande n'est pas une commande Crédit Pro.", 400);
    }
    if (order.payments.some((p) => p.status === "SUCCEEDED")) {
      throw new PaymentDomainError("Le solde de cette commande crédit est déjà encaissé.", 409);
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        reference: buildPaymentReference("PAY"),
        provider: mapMethodToProvider(params.method),
        method: params.method,
        isSandbox: false,
        amountXof: order.totalClientXof,
        currency: order.currency,
        status: "SUCCEEDED",
        idempotencyKey: `credit_settle_${order.id}_${crypto.randomBytes(6).toString("hex")}`,
        providerTransactionId: params.providerTransactionId || null,
        paidAt: new Date(),
        metadata: {
          settledByAdminId: params.adminUser.id,
          creditSettlement: true,
          note: params.note ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    const invoice = await ensureInvoiceForOrder(tx, order.id, "PAID", `Crédit Pro réglé (${params.method})`);

    await tx.auditLog.create({
      data: {
        actorUserId: params.adminUser.id,
        action: "CREDIT_PRO_ORDER_SETTLED",
        entityType: "Payment",
        entityId: payment.id,
        afterJson: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountXof: payment.amountXof,
          method: params.method,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });

    return { payment, invoice };
  });
}
