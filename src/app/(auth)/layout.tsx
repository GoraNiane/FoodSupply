import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <BrandLogo href="/" variant="dark" subtitle="Marketplace B2B Dakar" />
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-800/70 px-3 py-1.5 text-xs font-medium text-navy-100 transition-colors hover:bg-navy-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Commander sans compte
        </Link>
      </div>

      <main className="mx-auto my-8 w-full max-w-md">{children}</main>

      <p className="text-center text-xs text-navy-300">
        © {new Date().getFullYear()} FoodSupply Dakar — Connexion sécurisée & chiffrée
      </p>
    </div>
  );
}
