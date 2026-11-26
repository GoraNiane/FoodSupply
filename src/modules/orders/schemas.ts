import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const DELIVERY_SLOTS = [
  "DES_QUE_POSSIBLE",
  "TOT_06H30_08H30",
  "MATIN_08_11",
  "MIDI_11_14",
  "APRES_MIDI_14_18",
] as const;

export const submitOrderSchema = z.object({
  items: z
    .array(
      z.object({
        offerId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1, "Quantité minimum 1.").max(10000),
      })
    )
    .min(1, "Votre panier est vide.")
    .max(50, "Maximum 50 lignes par commande."),
  restaurantName: z.string().trim().max(150).optional().or(z.literal("")),
  contactName: z.string().trim().min(2, "Nom complet requis.").max(120),
  phone: z.string().trim().min(7, "Numéro de téléphone requis.").max(30),
  email: z.string().trim().email("Email invalide.").optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2, "Quartier à Dakar requis.").max(100),
  street: z.string().trim().min(3, "Adresse de livraison requise.").max(200),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  deliverySlot: z.enum(DELIVERY_SLOTS).default("DES_QUE_POSSIBLE"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const adminConfirmOrderSchema = z.object({
  items: z
    .array(
      z.object({
        orderItemId: z.string().trim().min(1),
        confirmedQty: z.coerce.number().int().min(0).max(10000),
        confirmedClientUnitPriceXof: z.coerce.number().int().min(0).max(50000000),
        confirmedSupplierUnitPriceXof: z.coerce.number().int().min(0).max(50000000).optional(),
      })
    )
    .min(1),
  deliveryFeeXof: z.coerce.number().int().min(0).max(500000).optional(),
  adminNote: z.string().trim().max(800).optional(),
});

export const clientOrderDecisionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
  guestToken: z.string().trim().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const adminStatusTransitionSchema = z.object({
  nextStatus: z.nativeEnum(OrderStatus),
  reason: z.string().trim().max(500).optional(),
  externalDriverName: z.string().trim().max(120).optional().or(z.literal("")),
  externalDriverPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
export type AdminConfirmOrderInput = z.infer<typeof adminConfirmOrderSchema>;
export type ClientOrderDecisionInput = z.infer<typeof clientOrderDecisionSchema>;
export type AdminStatusTransitionInput = z.infer<typeof adminStatusTransitionSchema>;
