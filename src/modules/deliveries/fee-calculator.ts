export interface DeliveryZoneFee {
  id: string;
  label: string;
  neighborhoods: string[];
  feeXof: number;
}

export interface DeliveryFeeRules {
  baseFeeXof: number;
  extraSupplierPickupFeeXof: number;
  coldChainSurchargeXof: number;
  fragileSurchargeXof: number;
  freeDeliveryThresholdXof: number;
  zoneFees?: DeliveryZoneFee[];
}

export const DEFAULT_DAKAR_ZONES: DeliveryZoneFee[] = [
  {
    id: "zone-centre",
    label: "Zone 1 — Dakar Centre & VDN",
    neighborhoods: [
      "Plateau",
      "Médina",
      "Fann",
      "Point E",
      "Mermoz",
      "Sacré-Cœur",
      "Amitié",
      "Keur Gorgui",
      "Liberté",
      "Sicap",
      "Dieuppeul",
      "Castors",
    ],
    feeXof: 1500,
  },
  {
    id: "zone-corniche",
    label: "Zone 2 — Almadies, Ngor, Ouakam & Yoff",
    neighborhoods: [
      "Almadies",
      "Ngor",
      "Ouakam",
      "Yoff",
      "Virage",
      "Mamelles",
      "Nord Foire",
      "Ouest Foire",
      "Sud Foire",
      "HLM",
      "Grand Dakar",
      "Grand Yoff",
      "Maristes",
      "Hann",
    ],
    feeXof: 2000,
  },
  {
    id: "zone-banlieue",
    label: "Zone 3 — Parcelles, Pikine, Guédiawaye & Keur Massar",
    neighborhoods: [
      "Parcelles Assainies",
      "Pikine",
      "Guédiawaye",
      "Keur Massar",
      "Thiaroye",
      "Yeumbeul",
      "Malika",
      "Mbao",
    ],
    feeXof: 3000,
  },
  {
    id: "zone-peripherie",
    label: "Zone 4 — Rufisque, Diamniadio & Périphérie",
    neighborhoods: ["Rufisque", "Bargny", "Diamniadio", "Sangalkam", "Saly", "Lac Rose"],
    feeXof: 4500,
  },
];

export const DEFAULT_DELIVERY_FEE_RULES: DeliveryFeeRules = {
  baseFeeXof: 2000,
  extraSupplierPickupFeeXof: 0,
  coldChainSurchargeXof: 1000,
  fragileSurchargeXof: 500,
  freeDeliveryThresholdXof: 250000,
  zoneFees: DEFAULT_DAKAR_ZONES,
};

export interface DeliveryFeeCalculationInput {
  subtotalClientXof: number;
  supplierCount?: number;
  requiresColdChain: boolean;
  hasFragileItems: boolean;
  neighborhood?: string | null;
  rules: DeliveryFeeRules;
}

export interface DeliveryFeeBreakdown {
  baseFeeXof: number;
  matchedZoneLabel: string | null;
  extraPickupsFeeXof: number;
  coldChainFeeXof: number;
  fragileFeeXof: number;
  freeDeliveryApplied: boolean;
  totalDeliveryFeeXof: number;
}

function normalizeGeoString(str: string): string {
  return str
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Identifie la zone tarifaire Dakar correspondant au quartier saisi par le client.
 */
export function resolveZoneForNeighborhood(
  neighborhood: string | null | undefined,
  rules: DeliveryFeeRules
): DeliveryZoneFee | null {
  if (!neighborhood || !neighborhood.trim()) return null;
  const zones = rules.zoneFees && rules.zoneFees.length > 0 ? rules.zoneFees : [];
  if (zones.length === 0) return null;

  const target = normalizeGeoString(neighborhood);
  for (const zone of zones) {
    for (const q of zone.neighborhoods) {
      const normalizedQ = normalizeGeoString(q);
      if (normalizedQ && (target.includes(normalizedQ) || normalizedQ.includes(target))) {
        return zone;
      }
    }
  }
  return null;
}

/**
 * Calcule les frais de livraison Dakar de manière déterministe en XOF entiers.
 */
export function computeDeliveryFeeXof(input: DeliveryFeeCalculationInput): DeliveryFeeBreakdown {
  const { subtotalClientXof, requiresColdChain, hasFragileItems, rules, neighborhood } = input;
  const supplierCount = Math.max(1, Math.round(input.supplierCount ?? 1));
  const matchedZone = resolveZoneForNeighborhood(neighborhood, rules);

  if (
    rules.freeDeliveryThresholdXof > 0 &&
    subtotalClientXof >= rules.freeDeliveryThresholdXof
  ) {
    return {
      baseFeeXof: 0,
      matchedZoneLabel: matchedZone?.label ?? null,
      extraPickupsFeeXof: 0,
      coldChainFeeXof: 0,
      fragileFeeXof: 0,
      freeDeliveryApplied: true,
      totalDeliveryFeeXof: 0,
    };
  }

  const baseFeeXof = Math.max(
    0,
    Math.round(matchedZone ? matchedZone.feeXof : rules.baseFeeXof)
  );
  const extraPickupsFeeXof =
    supplierCount > 1
      ? (supplierCount - 1) * Math.max(0, Math.round(rules.extraSupplierPickupFeeXof))
      : 0;
  const coldChainFeeXof = requiresColdChain
    ? Math.max(0, Math.round(rules.coldChainSurchargeXof))
    : 0;
  const fragileFeeXof = hasFragileItems
    ? Math.max(0, Math.round(rules.fragileSurchargeXof))
    : 0;

  return {
    baseFeeXof,
    matchedZoneLabel: matchedZone?.label ?? null,
    extraPickupsFeeXof,
    coldChainFeeXof,
    fragileFeeXof,
    freeDeliveryApplied: false,
    totalDeliveryFeeXof: baseFeeXof + extraPickupsFeeXof + coldChainFeeXof + fragileFeeXof,
  };
}
