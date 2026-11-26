"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  Tag,
  Trash2,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  ORDER_CHECKOUT_STEPS,
  Select,
  Stepper,
  Textarea,
  buttonVariants,
  useToast,
} from "@/components/ui";
import { useCart } from "./cart-context";
import {
  computeDeliveryFeeXof,
  type DeliveryFeeRules,
} from "@/modules/deliveries/fee-calculator";
import { resolveVolumeTierUnitPrice } from "@/modules/catalog/pricing";
import { formatXof } from "@/lib/utils/format";

export interface PrefillRestaurantInfo {
  restaurantName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  neighborhood?: string;
  street?: string;
  landmark?: string;
}

const POPULAR_DAKAR_NEIGHBORHOODS = [
  "Plateau",
  "Almadies",
  "Mermoz",
  "Sacré-Cœur",
  "Ngor",
  "Ouakam",
  "Yoff",
  "Point E",
  "Fann",
  "Médina",
  "Liberté",
  "Parcelles Assainies",
  "Pikine",
  "Guédiawaye",
  "Rufisque",
];

export function CartCheckoutClient({
  deliveryRules,
  prefill,
  isLoggedIn,
}: {
  deliveryRules: DeliveryFeeRules;
  prefill?: PrefillRestaurantInfo;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const {
    items,
    isHydrated,
    subtotalClientXof,
    totalVolumeSavingsXof,
    requiresColdChain,
    hasFragileItems,
    updateQuantity,
    removeItem,
    clearCart,
    rememberGuestOrder,
  } = useCart();

  const [restaurantName, setRestaurantName] = React.useState(prefill?.restaurantName ?? "");
  const [contactName, setContactName] = React.useState(prefill?.contactName ?? "");
  const [phone, setPhone] = React.useState(prefill?.phone ?? "");
  const [email, setEmail] = React.useState(prefill?.email ?? "");
  const [neighborhood, setNeighborhood] = React.useState(prefill?.neighborhood ?? "");
  const [street, setStreet] = React.useState(prefill?.street ?? "");
  const [landmark, setLandmark] = React.useState(prefill?.landmark ?? "");
  const [deliverySlot, setDeliverySlot] = React.useState("DES_QUE_POSSIBLE");
  const [notes, setNotes] = React.useState("");

  // Géolocalisation GPS pour Dakar (lien Google Maps pour le livreur)
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const feeBreakdown = computeDeliveryFeeXof({
    subtotalClientXof,
    requiresColdChain,
    hasFragileItems,
    neighborhood,
    rules: deliveryRules,
  });

  const estimatedTotalXof = subtotalClientXof + feeBreakdown.totalDeliveryFeeXof;

  function handleLocateGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      notify({
        type: "error",
        title: "Géolocalisation indisponible",
        description: "Indiquez simplement votre quartier et un repère connu à Dakar.",
      });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setIsLocating(false);
        notify({
          type: "success",
          title: "Position GPS enregistrée !",
          description: "Le livreur recevra votre point exact Google Maps.",
        });
      },
      () => {
        setIsLocating(false);
        notify({
          type: "error",
          title: "Position refusée ou indisponible",
          description: "Vous pouvez continuer sans GPS en indiquant votre repère.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ offerId: i.offerId, quantity: i.quantity })),
          restaurantName,
          contactName,
          phone,
          email,
          neighborhood,
          street,
          landmark,
          latitude: coords?.lat,
          longitude: coords?.lng,
          deliverySlot,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de soumettre la commande.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      rememberGuestOrder({
        orderNumber: data.orderNumber,
        trackingUrl: data.trackingUrl,
        totalClientXof: data.totalClientXof,
        createdAt: new Date().toISOString(),
        restaurantName: restaurantName.trim() || contactName.trim(),
      });
      clearCart();
      notify({
        type: "success",
        title: `Demande ${data.orderNumber} envoyée`,
        description: "FoodSupply vérifie vos stocks et prix avant paiement.",
      });
      router.push(data.trackingUrl);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-7 w-7" />}
        title="Votre panier est vide"
        description="Ajoutez des produits depuis le catalogue FoodSupply — aucune inscription requise pour commander."
        action={
          <Link href="/catalogue" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Parcourir le catalogue
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Stepper steps={ORDER_CHECKOUT_STEPS} currentStepIndex={0} />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LISTE DES ARTICLES + COORDONNÉES LIVRAISON */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="border-b border-surface-border px-6 py-4">
              <h2 className="text-base font-bold text-navy-900">
                Articles sélectionnés ({items.length})
              </h2>
            </div>
            <ul className="divide-y divide-surface-border">
              {items.map((item) => {
                const { effectiveUnitPriceXof, appliedTier } = resolveVolumeTierUnitPrice(
                  item.clientUnitPriceXof,
                  item.quantity,
                  item.volumeTiers
                );
                return (
                  <li
                    key={item.offerId}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/catalogue/${item.slug}`}
                        className="text-sm font-bold text-navy-900 hover:text-brand-600"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.unitLabel} •{" "}
                        {appliedTier ? (
                          <>
                            <span className="line-through opacity-70">
                              {formatXof(item.clientUnitPriceXof)}
                            </span>{" "}
                            <strong className="text-success-700">
                              {formatXof(effectiveUnitPriceXof)} / unité
                            </strong>
                          </>
                        ) : (
                          `${formatXof(effectiveUnitPriceXof)} / unité`
                        )}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {appliedTier && (
                          <Badge variant="success">
                            <Tag className="h-3 w-3" />
                            Tarif gros dès {appliedTier.minQty} unités
                          </Badge>
                        )}
                        {item.storageType !== "AMBIENT" && (
                          <Badge variant="info">
                            <Snowflake className="h-3 w-3" />
                            {item.storageType === "FROZEN" ? "Surgelé" : "Frais"}
                          </Badge>
                        )}
                        {item.isFragile && (
                          <Badge variant="warning">
                            <ShieldAlert className="h-3 w-3" />
                            Fragile
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center rounded-lg border border-surface-border bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.offerId, item.quantity - 1)}
                          disabled={item.quantity <= item.minOrderQty}
                          className="flex h-9 w-8 items-center justify-center text-navy-900 hover:bg-surface-subtle disabled:opacity-40"
                          aria-label="Réduire la quantité"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-navy-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.offerId, item.quantity + 1)}
                          className="flex h-9 w-8 items-center justify-center text-navy-900 hover:bg-surface-subtle"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="w-28 text-right text-sm font-bold text-navy-900">
                        {formatXof(effectiveUnitPriceXof * item.quantity)}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeItem(item.offerId)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                        aria-label={`Retirer ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-navy-900">
                  Coordonnées de livraison à Dakar
                </h2>
                <p className="text-xs text-slate-500">
                  {isLoggedIn
                    ? "Pré-rempli avec votre compte client."
                    : "Commande express sans inscription : renseignez simplement où livrer."}
                </p>
              </div>
              {!isLoggedIn && <Badge variant="success">Sans compte requis</Badge>}
            </div>

            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4" noValidate>
              {error && (
                <Alert variant="danger" title="Impossible d'envoyer la commande">
                  {error}
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Nom complet"
                  htmlFor="chk-contact"
                  required
                  error={fieldErrors.contactName?.[0]}
                >
                  <Input
                    id="chk-contact"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex. Ibrahima Fall"
                    required
                  />
                </FormField>

                <FormField
                  label="Établissement / Restaurant (optionnel)"
                  htmlFor="chk-resto"
                  error={fieldErrors.restaurantName?.[0]}
                >
                  <Input
                    id="chk-resto"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Ex. Restaurant Le Bon Goût"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Téléphone / WhatsApp"
                  htmlFor="chk-phone"
                  required
                  error={fieldErrors.phone?.[0]}
                >
                  <Input
                    id="chk-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    required
                  />
                </FormField>

                <FormField
                  label="Email (optionnel, pour facture)"
                  htmlFor="chk-email"
                  error={fieldErrors.email?.[0]}
                >
                  <Input
                    id="chk-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@monrestaurant.sn"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Quartier à Dakar"
                  htmlFor="chk-neighborhood"
                  required
                  hint={
                    feeBreakdown.matchedZoneLabel
                      ? `Zone détectée : ${feeBreakdown.matchedZoneLabel}`
                      : "Sélectionnez ou tapez votre quartier Dakar."
                  }
                  error={fieldErrors.neighborhood?.[0]}
                >
                  <Input
                    id="chk-neighborhood"
                    list="dakar-neighborhoods"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex. Almadies, Plateau, Mermoz, Sacré-Cœur..."
                    required
                  />
                  <datalist id="dakar-neighborhoods">
                    {POPULAR_DAKAR_NEIGHBORHOODS.map((q) => (
                      <option key={q} value={q} />
                    ))}
                  </datalist>
                </FormField>

                <FormField
                  label="Rue / Adresse"
                  htmlFor="chk-street"
                  required
                  error={fieldErrors.street?.[0]}
                >
                  <Input
                    id="chk-street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ex. Route des Almadies, Zone 12"
                    required
                  />
                </FormField>
              </div>

              {/* PARTAGE POSITION GPS DAKAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5">
                <div className="flex items-center gap-2.5 text-xs">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <p className="font-semibold text-navy-900">
                      Position GPS Google Maps (recommandé à Dakar)
                    </p>
                    {coords ? (
                      <p className="text-success-700 font-medium">
                        Point exact enregistré ({coords.lat}, {coords.lng}) —{" "}
                        <a
                          href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Vérifier sur Maps
                        </a>
                      </p>
                    ) : (
                      <p className="text-slate-500">
                        Permet au livreur de trouver votre cuisine directement sans vous appeler 5
                        fois.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={coords ? "outline" : "primary"}
                  isLoading={isLocating}
                  onClick={handleLocateGps}
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  {coords ? "Actualiser ma position" : "Partager ma position GPS"}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Créneau de livraison souhaité" htmlFor="chk-slot">
                  <Select
                    id="chk-slot"
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                  >
                    <option value="DES_QUE_POSSIBLE">Dès que possible</option>
                    <option value="TOT_06H30_08H30">
                      Très tôt cuisine (06h30 – 08h30)
                    </option>
                    <option value="MATIN_08_11">Matin (08h00 – 11h00)</option>
                    <option value="MIDI_11_14">Midi (11h00 – 14h00)</option>
                    <option value="APRES_MIDI_14_18">Après-midi (14h00 – 18h00)</option>
                  </Select>
                </FormField>

                <FormField label="Repère précis (optionnel)" htmlFor="chk-landmark">
                  <Input
                    id="chk-landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Ex. En face de la station Shell"
                  />
                </FormField>
              </div>

              <FormField label="Instructions de livraison (horaire souhaité, etc.)" htmlFor="chk-notes">
                <Textarea
                  id="chk-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. Livraison souhaitée demain matin avant 8h pour la mise en place..."
                />
              </FormField>
            </form>
          </Card>
        </div>

        {/* RÉCAPITULATIF & SOUMISSION */}
        <div className="lg:col-span-4">
          <Card className="sticky top-24 space-y-5 p-6">
            <h2 className="text-base font-bold text-navy-900">Récapitulatif estimatif</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total produits</span>
                <span className="font-semibold text-navy-900">{formatXof(subtotalClientXof)}</span>
              </div>
              {totalVolumeSavingsXof > 0 && (
                <div className="flex justify-between text-xs font-semibold text-success-700">
                  <span>Remise volume appliquée</span>
                  <span>-{formatXof(totalVolumeSavingsXof)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>
                  Livraison Dakar
                  {feeBreakdown.matchedZoneLabel ? (
                    <span className="block text-[11px] text-slate-400">
                      {feeBreakdown.matchedZoneLabel}
                    </span>
                  ) : null}
                </span>
                <span className="font-semibold text-navy-900">
                  {feeBreakdown.freeDeliveryApplied
                    ? "Offerte (0 FCFA)"
                    : formatXof(feeBreakdown.totalDeliveryFeeXof)}
                </span>
              </div>
              {feeBreakdown.coldChainFeeXof > 0 && (
                <p className="text-[11px] text-slate-500">
                  Inclut supplément chaîne du froid ({formatXof(feeBreakdown.coldChainFeeXof)})
                </p>
              )}
              {feeBreakdown.fragileFeeXof > 0 && (
                <p className="text-[11px] text-slate-500">
                  Inclut manutention produits fragiles ({formatXof(feeBreakdown.fragileFeeXof)})
                </p>
              )}
              <div className="flex justify-between border-t border-surface-border pt-3 text-base font-extrabold text-navy-900">
                <span>Total estimé</span>
                <span className="text-brand-600">{formatXof(estimatedTotalXof)}</span>
              </div>
            </div>

            <Alert variant="info" title="Aucun débit immédiat">
              FoodSupply confirme d&apos;abord les stocks et tarifs exacts. Vous payez ensuite par{" "}
              <strong>Wave</strong> (montant pré-rempli) ou à la livraison.
            </Alert>

            <Button
              type="submit"
              form="checkout-form"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              loadingText="Envoi de la demande..."
            >
              Soumettre ma demande de commande
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Link
              href="/catalogue"
              className="block text-center text-xs font-medium text-slate-500 hover:text-navy-900"
            >
              Continuer mes achats
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
