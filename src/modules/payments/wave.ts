import crypto from "crypto";

/**
 * Lien marchand Wave Sénégal officiel de FoodSupply.
 * Ouvre directement l'application Wave du client avec le montant XOF pré-rempli (?amount=...).
 */
export const DEFAULT_WAVE_MERCHANT_URL = "https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/";

export interface PaymentConfig {
  waveMerchantBaseUrl: string;
  allowCashOnDelivery: boolean;
  allowOrangeMoney: boolean;
  orangeMoneyMerchantCode: string;
  whatsappSupportPhone: string;
}

export interface CompanyProfileConfig {
  legalName: string;
  address: string;
  ninea: string;
  rc: string;
  phone: string;
  email: string;
  currency: string;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  waveMerchantBaseUrl: DEFAULT_WAVE_MERCHANT_URL,
  allowCashOnDelivery: true,
  allowOrangeMoney: false,
  orangeMoneyMerchantCode: "",
  whatsappSupportPhone: "+221338204500",
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfileConfig = {
  legalName: "FoodSupply Sénégal SARL",
  address: "Sacré-Cœur 3, VDN, Dakar, Sénégal",
  ninea: "À renseigner dans Paramètres",
  rc: "À renseigner dans Paramètres",
  phone: "+221 33 820 45 00",
  email: "contact@foodsupply.sn",
  currency: "XOF",
};

/**
 * Valide qu'une URL marchande Wave pointe strictement vers pay.wave.com en HTTPS.
 * Prévient toute redirection malveillante ou injection javascript:.
 */
export function isValidWaveMerchantUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "pay.wave.com" &&
      parsed.pathname.startsWith("/m/")
    );
  } catch {
    return false;
  }
}

/**
 * Construit le lien de paiement Wave avec le montant entier FCFA (XOF) pré-rempli.
 * Format officiel Wave Sénégal : https://pay.wave.com/m/<ID>/c/sn/?amount=<XOF>
 */
export function buildWavePaymentUrl(amountXof: number, merchantBaseUrl?: string): string {
  const roundedAmount = Math.round(amountXof);
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
    throw new Error("Le montant Wave doit être un entier positif en FCFA.");
  }

  const base =
    merchantBaseUrl && isValidWaveMerchantUrl(merchantBaseUrl)
      ? merchantBaseUrl.trim()
      : DEFAULT_WAVE_MERCHANT_URL;

  const url = new URL(base);
  url.searchParams.set("amount", String(roundedAmount));
  return url.toString();
}

/**
 * Vérifie une signature webhook HMAC-SHA256 en temps constant.
 */
export function verifyWebhookHmacSignature(params: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
}): boolean {
  if (!params.signatureHeader || !params.secret) {
    return false;
  }

  const normalizedHeader = params.signatureHeader.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(normalizedHeader)) {
    return false;
  }

  const expectedHex = crypto
    .createHmac("sha256", params.secret)
    .update(params.rawBody, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const receivedBuf = Buffer.from(normalizedHeader, "hex");

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
