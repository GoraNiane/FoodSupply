import { formatDateDakar, formatXof } from "@/lib/utils/format";

/**
 * Normalise un numéro sénégalais pour wa.me (chiffres uniquement, préfixe 221 si 9 chiffres locaux).
 */
export function normalizeSenegalWhatsAppPhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00221")) return digits.slice(2);
  if (digits.length === 9 && /^(70|75|76|77|78|33)/.test(digits)) {
    return `221${digits}`;
  }
  return digits;
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeSenegalWhatsAppPhone(phone);
  if (normalized.length < 8) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildOrderConfirmedWaveMessage(params: {
  clientName: string;
  orderNumber: string;
  totalClientXof: number;
  waveUrl: string | null;
  trackingUrl?: string;
}): string {
  const lines = [
    `Bonjour ${params.clientName},`,
    `Votre commande FoodSupply *${params.orderNumber}* est confirmée.`,
    `Montant total définitif : *${formatXof(params.totalClientXof)}*.`,
  ];
  if (params.waveUrl) {
    lines.push("", `Réglez directement par Wave (montant pré-rempli) :`, params.waveUrl);
  }
  if (params.trackingUrl) {
    lines.push("", `Suivi & facture de votre commande :`, params.trackingUrl);
  }
  lines.push("", "Merci pour votre confiance — FoodSupply Dakar.");
  return lines.join("\n");
}

export function buildDriverDispatchedMessage(params: {
  clientName: string;
  orderNumber: string;
  driverName?: string | null;
  driverPhone?: string | null;
  etaNote?: string | null;
}): string {
  const lines = [
    `Bonjour ${params.clientName},`,
    `Votre commande FoodSupply *${params.orderNumber}* est en cours de livraison !`,
  ];
  if (params.driverName || params.driverPhone) {
    lines.push(
      `Livreur : *${params.driverName || "Équipe FoodSupply"}*${
        params.driverPhone ? ` (${params.driverPhone})` : ""
      }`
    );
  }
  if (params.etaNote) {
    lines.push(`Info livraison : ${params.etaNote}`);
  }
  lines.push("FoodSupply Dakar");
  return lines.join("\n");
}

export function buildCreditReminderMessage(params: {
  clientName: string;
  orderNumber: string;
  totalClientXof: number;
  dueAt: Date | string | null;
  waveUrl: string | null;
}): string {
  const dueText = params.dueAt ? ` (échéance : ${formatDateDakar(params.dueAt, false)})` : "";
  const lines = [
    `Bonjour ${params.clientName},`,
    `Petit rappel amical concernant votre facture Crédit Pro FoodSupply *${params.orderNumber}*${dueText}.`,
    `Solde à régler : *${formatXof(params.totalClientXof)}*.`,
  ];
  if (params.waveUrl) {
    lines.push("", `Lien Wave rapide (montant pré-rempli) :`, params.waveUrl);
  }
  lines.push("", "Merci et excellente journée — FoodSupply Dakar.");
  return lines.join("\n");
}

export function buildMissingProductRequestMessage(searchQuery?: string): string {
  if (searchQuery) {
    return `Bonjour FoodSupply Dakar, je recherche ce produit qui n'apparaît pas sur le catalogue : "${searchQuery}". Pouvez-vous me faire un devis ?`;
  }
  return "Bonjour FoodSupply Dakar, je souhaite demander un devis ou un produit spécifique pour mon établissement.";
}

export function buildProductShareMessage(params: {
  productName: string;
  unitLabel: string;
  priceXof: number;
  productUrl: string;
}): string {
  return [
    `Produit FoodSupply Dakar : *${params.productName}* (${params.unitLabel})`,
    `Tarif pro : *${formatXof(params.priceXof)}*`,
    params.productUrl,
  ].join("\n");
}

/**
 * Adaptateur prêt pour l'API Meta WhatsApp Business Cloud (actif dès configuration des variables
 * WHATSAPP_CLOUD_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID dans .env).
 */
export async function sendWhatsAppCloudTextMessage(params: {
  toPhone: string;
  text: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { sent: false, skipped: true };
  }

  const normalized = normalizeSenegalWhatsAppPhone(params.toPhone);
  if (normalized.length < 8) {
    return { sent: false, error: "Numéro destinataire invalide." };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalized,
          type: "text",
          text: { body: params.text },
        }),
      }
    );

    if (!res.ok) {
      return { sent: false, error: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}
