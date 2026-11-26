import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/cart/cart-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0D1B44",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://foodsupply.sn";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "FoodSupply — Approvisionnement B2B Alimentaire à Dakar",
    template: "%s | FoodSupply",
  },
  description:
    "Approvisionnez votre restaurant, fast-food, boulangerie ou hôtel à Dakar en une seule commande, sans inscription obligatoire. Paiement Wave & livraison rapide.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "fr_SN",
    url: APP_URL,
    siteName: "FoodSupply Dakar",
    title: "FoodSupply Dakar — Approvisionnement Pro pour Restaurants & Hôtels",
    description:
      "Commandez vos produits alimentaires en gros & demi-gros à Dakar sans créer de compte. Paiement direct par Wave et livraison matinale.",
    images: [
      {
        url: "/images/hero-dakar-foodsupply.jpg",
        width: 1200,
        height: 675,
        alt: "FoodSupply Dakar — Approvisionnement professionnel B2B",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FoodSupply Dakar — Approvisionnement B2B Alimentaire",
    description: "Commandez vos produits alimentaires professionnels à Dakar. Paiement Wave.",
    images: ["/images/hero-dakar-foodsupply.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FoodSupply",
  },
  icons: {
    icon: "/icons/foodsupply-icon.svg",
    apple: "/icons/foodsupply-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
