import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { getPlatformDeliveryRules } from "@/modules/catalog/admin-service";
import {
  CartCheckoutClient,
  type PrefillRestaurantInfo,
} from "@/components/cart/cart-checkout-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon panier",
  description: "Finalisez votre demande de commande alimentaire B2B à Dakar sans inscription obligatoire.",
};

export default async function PublicCartPage() {
  const [deliveryRules, sessionUser] = await Promise.all([
    getPlatformDeliveryRules(),
    getVerifiedSessionUser(),
  ]);

  let prefill: PrefillRestaurantInfo | undefined;
  if (sessionUser?.restaurantId) {
    try {
      const resto = await prisma.restaurant.findUnique({
        where: { id: sessionUser.restaurantId },
        include: {
          addresses: { where: { deletedAt: null }, orderBy: { isDefault: "desc" }, take: 1 },
        },
      });
      if (resto) {
        const addr = resto.addresses[0];
        prefill = {
          restaurantName: resto.businessName,
          contactName: addr?.contactName ?? sessionUser.fullName,
          phone: addr?.contactPhone ?? resto.contactPhone,
          email: resto.contactEmail ?? sessionUser.email,
          neighborhood: addr?.neighborhood ?? "",
          street: addr?.street ?? "",
          landmark: addr?.landmark ?? "",
        };
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-900">Mon panier</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vérifiez vos quantités et soumettez votre demande — aucune création de compte requise.
        </p>
      </div>

      <CartCheckoutClient
        deliveryRules={deliveryRules}
        prefill={prefill}
        isLoggedIn={Boolean(sessionUser)}
      />
    </div>
  );
}
