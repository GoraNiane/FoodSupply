/**
 * Formate un montant entier en Francs CFA (XOF) sans décimales flottantes.
 */
export function formatXof(amountXof: number): string {
  const safeAmount = Math.round(amountXof);
  const formatted = new Intl.NumberFormat("fr-SN", {
    maximumFractionDigits: 0,
  }).format(safeAmount);
  return `${formatted.replace(/\u202f/g, " ")} FCFA`;
}

/**
 * Formate une date dans le fuseau horaire de Dakar (Africa/Dakar, UTC+0).
 */
export function formatDateDakar(date: Date | string, includeTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/**
 * Calcule le prix unitaire client en XOF à partir du prix fournisseur et de la règle de marge.
 * Utilise exclusivement de l'arithmétique entière / arrondi déterministe.
 */
export function computeClientPriceXof(params: {
  supplierPriceXof: number;
  marginType: "PERCENTAGE" | "FIXED_XOF";
  marginValue: number;
}): { clientUnitPriceXof: number; marginUnitAmountXof: number } {
  const supplierPrice = Math.max(0, Math.round(params.supplierPriceXof));
  const marginVal = Math.max(0, Math.round(params.marginValue));

  if (params.marginType === "FIXED_XOF") {
    return {
      clientUnitPriceXof: supplierPrice + marginVal,
      marginUnitAmountXof: marginVal,
    };
  }

  // PERCENTAGE exprimé en points de base (1500 = 15.00 %)
  const marginUnitAmountXof = Math.round((supplierPrice * marginVal) / 10000);
  return {
    clientUnitPriceXof: supplierPrice + marginUnitAmountXof,
    marginUnitAmountXof,
  };
}
