import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodSupply Dakar — Approvisionnement B2B",
    short_name: "FoodSupply",
    description:
      "Commandez vos produits alimentaires professionnels à Dakar avec livraison rapide et paiement Wave.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0D1B44",
    lang: "fr",
    icons: [
      {
        src: "/icons/foodsupply-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
