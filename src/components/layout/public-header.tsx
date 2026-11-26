"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils/cn";

const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/suivi", label: "Suivre ma commande" },
  { href: "/devenir-fournisseur", label: "Devenir fournisseur" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { lineCount, isHydrated } = useCart();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const isHome = pathname === "/";

  React.useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = isHome && !isScrolled && !mobileOpen;

  return (
    <header
      className={cn(
        "z-40 w-full transition-all duration-200",
        isHome ? "fixed inset-x-0 top-0" : "sticky top-0",
        isTransparent
          ? "border-b border-transparent bg-transparent"
          : "border-b border-surface-border bg-white/95 shadow-xs backdrop-blur"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
          isTransparent ? "h-12 sm:h-16" : "h-16"
        )}
      >
        <BrandLogo href="/" />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV_LINKS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? isTransparent
                      ? "bg-white/75 font-semibold text-ink-900 backdrop-blur-xs"
                      : "bg-brand-50 font-semibold text-brand-700"
                    : isTransparent
                      ? "text-ink-900 hover:bg-white/60"
                      : "text-slate-600 hover:bg-surface-subtle hover:text-navy-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/panier"
            className={cn(
              "relative inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-ink-900 transition-colors",
              isTransparent
                ? "border-white/70 bg-white/75 backdrop-blur-xs hover:bg-white"
                : "border-surface-border bg-surface-muted hover:border-brand-300 hover:bg-brand-50"
            )}
            aria-label="Ouvrir mon panier"
          >
            <ShoppingCart className="h-4 w-4 text-brand-600" />
            <span className="hidden sm:inline">Panier</span>
            {isHydrated && lineCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                {lineCount}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/connexion-fournisseur"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: isTransparent ? "border-white/80 bg-white/80 backdrop-blur-xs hover:bg-white" : undefined,
              })}
            >
              Espace fournisseur
            </Link>
            <Link href="/catalogue" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Commander
            </Link>
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-lg p-2 text-ink-900 lg:hidden",
              isTransparent ? "bg-white/70 backdrop-blur-xs hover:bg-white" : "hover:bg-surface-subtle"
            )}
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Ouvrir le menu de navigation"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-surface-border bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {PUBLIC_NAV_LINKS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-surface-border pt-4">
            <Link
              href="/connexion"
              onClick={() => setMobileOpen(false)}
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Connexion
            </Link>
            <Link
              href="/panier"
              onClick={() => setMobileOpen(false)}
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Mon panier
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
