"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Save, Smartphone } from "lucide-react";
import { Alert, Button, Card, FormField, Input, useToast } from "@/components/ui";
import {
  buildWavePaymentUrl,
  isValidWaveMerchantUrl,
  type CompanyProfileConfig,
  type PaymentConfig,
} from "@/modules/payments/wave";

export function AdminSettingsManager({
  initialPaymentConfig,
  initialCompanyProfile,
}: {
  initialPaymentConfig: PaymentConfig;
  initialCompanyProfile: CompanyProfileConfig;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [waveUrl, setWaveUrl] = React.useState(initialPaymentConfig.waveMerchantBaseUrl);
  const [allowCod, setAllowCod] = React.useState(initialPaymentConfig.allowCashOnDelivery);
  const [allowOrangeMoney, setAllowOrangeMoney] = React.useState(
    initialPaymentConfig.allowOrangeMoney
  );
  const [orangeMoneyMerchantCode, setOrangeMoneyMerchantCode] = React.useState(
    initialPaymentConfig.orangeMoneyMerchantCode
  );
  const [whatsappSupport, setWhatsappSupport] = React.useState(
    initialPaymentConfig.whatsappSupportPhone
  );

  const [legalName, setLegalName] = React.useState(initialCompanyProfile.legalName);
  const [address, setAddress] = React.useState(initialCompanyProfile.address);
  const [ninea, setNinea] = React.useState(initialCompanyProfile.ninea);
  const [rc, setRc] = React.useState(initialCompanyProfile.rc);
  const [phone, setPhone] = React.useState(initialCompanyProfile.phone);
  const [email, setEmail] = React.useState(initialCompanyProfile.email);

  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const previewUrl = isValidWaveMerchantUrl(waveUrl)
    ? buildWavePaymentUrl(25000, waveUrl)
    : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentConfig: {
            waveMerchantBaseUrl: waveUrl.trim(),
            allowCashOnDelivery: allowCod,
            allowOrangeMoney,
            orangeMoneyMerchantCode: orangeMoneyMerchantCode.trim(),
            whatsappSupportPhone: whatsappSupport.trim(),
          },
          companyProfile: {
            legalName: legalName.trim(),
            address: address.trim(),
            ninea: ninea.trim(),
            rc: rc.trim(),
            phone: phone.trim(),
            email: email.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer les paramètres.");
        return;
      }
      notify({
        type: "success",
        title: "Paramètres enregistrés",
        description: "Le lien Wave et les mentions de facturation PDF ont été mis à jour.",
      });
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-900">
              Paiement direct Wave Sénégal & options de règlement
            </h2>
            <p className="text-xs text-slate-500">
              Le bouton &laquo; Payer par Wave &raquo; ouvre automatiquement l&apos;application Wave
              du client avec <code>?amount=MONTANT_FCFA</code>.
            </p>
          </div>
        </div>

        <FormField
          label="Lien marchand Wave (URL de base)"
          htmlFor="wave-merchant-url"
          required
          hint="Format officiel : https://pay.wave.com/m/M_sn_.../c/sn/"
        >
          <Input
            id="wave-merchant-url"
            type="url"
            required
            value={waveUrl}
            onChange={(e) => setWaveUrl(e.target.value)}
            placeholder="https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/"
          />
        </FormField>

        {previewUrl && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-navy-900">
                Aperçu du lien généré pour 25 000 FCFA :
              </span>
              <p className="truncate font-mono text-brand-700">{previewUrl}</p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1DC4FF] px-3 py-1.5 font-bold text-ink-900 hover:bg-[#0BB5F2]"
            >
              Tester Wave
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Numéro WhatsApp support client" htmlFor="wa-support" required>
            <Input
              id="wa-support"
              value={whatsappSupport}
              onChange={(e) => setWhatsappSupport(e.target.value)}
              placeholder="+221338204500"
            />
          </FormField>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-sm font-medium text-navy-900">
              <input
                type="checkbox"
                checked={allowCod}
                onChange={(e) => setAllowCod(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Autoriser aussi le paiement à la livraison
            </label>
          </div>
        </div>

        <div className="grid gap-4 border-t border-surface-border pt-4 sm:grid-cols-2">
          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-sm font-medium text-navy-900">
              <input
                type="checkbox"
                checked={allowOrangeMoney}
                onChange={(e) => setAllowOrangeMoney(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Activer Orange Money (option secondaire)
            </label>
          </div>

          <FormField
            label="Code / Numéro marchand Orange Money"
            htmlFor="om-code"
            hint="Ex. #144#391*CODE# ou numéro marchand OM"
          >
            <Input
              id="om-code"
              value={orangeMoneyMerchantCode}
              onChange={(e) => setOrangeMoneyMerchantCode(e.target.value)}
              placeholder="Ex. 77 123 45 67 (FoodSupply)"
              disabled={!allowOrangeMoney}
            />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-900">
              Identité légale FoodSupply (affichée sur les factures PDF)
            </h2>
            <p className="text-xs text-slate-500">
              Mentions légales sénégalaises imprimées en en-tête et pied de page des factures clients.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Raison sociale" htmlFor="co-legal" required>
            <Input
              id="co-legal"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </FormField>
          <FormField label="Adresse complète (Dakar)" htmlFor="co-addr" required>
            <Input
              id="co-addr"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>
          <FormField label="NINEA" htmlFor="co-ninea">
            <Input id="co-ninea" value={ninea} onChange={(e) => setNinea(e.target.value)} />
          </FormField>
          <FormField label="Registre de commerce (RC)" htmlFor="co-rc">
            <Input id="co-rc" value={rc} onChange={(e) => setRc(e.target.value)} />
          </FormField>
          <FormField label="Téléphone commercial" htmlFor="co-phone" required>
            <Input
              id="co-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>
          <FormField label="E-mail de facturation" htmlFor="co-email" required>
            <Input
              id="co-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" isLoading={isSaving}>
          <Save className="h-4 w-4" />
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}
