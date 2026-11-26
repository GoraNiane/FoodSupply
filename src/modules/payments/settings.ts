import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import {
  DEFAULT_COMPANY_PROFILE,
  DEFAULT_PAYMENT_CONFIG,
  isValidWaveMerchantUrl,
  type CompanyProfileConfig,
  type PaymentConfig,
} from "@/modules/payments/wave";

export const getPaymentConfig = unstable_cache(
  async (): Promise<PaymentConfig> => {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: "payment_config" },
      });
      const val = setting?.valueJson as Partial<PaymentConfig> | undefined;
      if (val) {
        return {
          waveMerchantBaseUrl:
            val.waveMerchantBaseUrl && isValidWaveMerchantUrl(val.waveMerchantBaseUrl)
              ? val.waveMerchantBaseUrl
              : DEFAULT_PAYMENT_CONFIG.waveMerchantBaseUrl,
          allowCashOnDelivery:
            typeof val.allowCashOnDelivery === "boolean"
              ? val.allowCashOnDelivery
              : DEFAULT_PAYMENT_CONFIG.allowCashOnDelivery,
          allowOrangeMoney:
            typeof val.allowOrangeMoney === "boolean"
              ? val.allowOrangeMoney
              : DEFAULT_PAYMENT_CONFIG.allowOrangeMoney,
          orangeMoneyMerchantCode:
            typeof val.orangeMoneyMerchantCode === "string"
              ? val.orangeMoneyMerchantCode.trim()
              : DEFAULT_PAYMENT_CONFIG.orangeMoneyMerchantCode,
          whatsappSupportPhone:
            typeof val.whatsappSupportPhone === "string" && val.whatsappSupportPhone.trim()
              ? val.whatsappSupportPhone.trim()
              : DEFAULT_PAYMENT_CONFIG.whatsappSupportPhone,
        };
      }
    } catch {
      // Fallback par défaut
    }
    return DEFAULT_PAYMENT_CONFIG;
  },
  ["foodsupply-payment-config"],
  { revalidate: 120, tags: ["settings"] }
);

export const getCompanyProfile = unstable_cache(
  async (): Promise<CompanyProfileConfig> => {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: "company_profile" },
      });
      const val = setting?.valueJson as Partial<CompanyProfileConfig> | undefined;
      if (val) {
        return {
          legalName: val.legalName?.trim() || DEFAULT_COMPANY_PROFILE.legalName,
          address: val.address?.trim() || DEFAULT_COMPANY_PROFILE.address,
          ninea: val.ninea?.trim() || DEFAULT_COMPANY_PROFILE.ninea,
          rc: val.rc?.trim() || DEFAULT_COMPANY_PROFILE.rc,
          phone: val.phone?.trim() || DEFAULT_COMPANY_PROFILE.phone,
          email: val.email?.trim() || DEFAULT_COMPANY_PROFILE.email,
          currency: val.currency?.trim() || "XOF",
        };
      }
    } catch {
      // Fallback par défaut
    }
    return DEFAULT_COMPANY_PROFILE;
  },
  ["foodsupply-company-profile"],
  { revalidate: 120, tags: ["settings"] }
);
