import { z } from "zod";
import { isValidWaveMerchantUrl } from "@/modules/payments/wave";

export const initiatePaymentSchema = z.object({
  orderNumber: z.string().trim().min(4).max(60),
  method: z.enum(["WAVE", "ORANGE_MONEY", "CASH_ON_DELIVERY"]).default("WAVE"),
  guestToken: z.string().trim().min(10).max(200).optional(),
  clientDeclaredPaid: z.boolean().optional(),
  clientDeclarationRef: z.string().trim().max(80).optional(),
  payerPhone: z.string().trim().max(30).optional(),
});

export const adminConfirmPaymentSchema = z.object({
  orderId: z.string().trim().min(5),
  paymentId: z.string().trim().min(5).optional(),
  method: z.enum(["WAVE", "ORANGE_MONEY", "CARD", "BANK_TRANSFER", "CASH_ON_DELIVERY"]).optional(),
  providerTransactionId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(400).optional(),
});

export const adminFailPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const adminRefundPaymentSchema = z.object({
  amountXof: z.coerce.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(400),
});

export const adminSettingsUpdateSchema = z.object({
  paymentConfig: z
    .object({
      waveMerchantBaseUrl: z
        .string()
        .trim()
        .refine(isValidWaveMerchantUrl, "L'URL Wave doit commencer par https://pay.wave.com/m/"),
      allowCashOnDelivery: z.boolean(),
      allowOrangeMoney: z.boolean().default(false),
      orangeMoneyMerchantCode: z.string().trim().max(100).default(""),
      whatsappSupportPhone: z.string().trim().min(6).max(30),
    })
    .optional(),
  companyProfile: z
    .object({
      legalName: z.string().trim().min(2).max(160),
      address: z.string().trim().min(4).max(240),
      ninea: z.string().trim().max(80),
      rc: z.string().trim().max(80),
      phone: z.string().trim().min(6).max(40),
      email: z.string().trim().email(),
    })
    .optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type AdminConfirmPaymentInput = z.infer<typeof adminConfirmPaymentSchema>;
export type AdminFailPaymentInput = z.infer<typeof adminFailPaymentSchema>;
export type AdminRefundPaymentInput = z.infer<typeof adminRefundPaymentSchema>;
export type AdminSettingsUpdateInput = z.infer<typeof adminSettingsUpdateSchema>;
