"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";

/**
 * Écran de démarrage FoodSupply (fond noir, logo centré, barre & anneau de chargement).
 * S'affiche à l'ouverture initiale ou lors d'un rechargement complet de la page,
 * puis disparaît en fondu fluide sans jamais ralentir la navigation interne.
 */
export function StartupSplash() {
  const [phase, setPhase] = React.useState<"visible" | "fading" | "hidden">("visible");

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const holdMs = prefersReduced ? 300 : 1150;
    const fadeMs = prefersReduced ? 150 : 420;

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const startFade = () => {
      setPhase("fading");
      fadeTimer = setTimeout(() => {
        setPhase("hidden");
      }, fadeMs);
    };

    const holdTimer = setTimeout(startFade, holdMs);

    return () => {
      clearTimeout(holdTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Chargement de FoodSupply"
      aria-busy={phase === "visible"}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 transition-all duration-500 ease-out ${
        phase === "fading" ? "pointer-events-none opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
    >
      {/* Halo bleu royal très discret derrière le logo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-brand-600/20 blur-3xl"
      />

      {/* Logo centré */}
      <div className="relative flex flex-col items-center animate-splash-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[0_0_40px_rgba(37,99,235,0.45)]">
          <ShoppingCart className="h-10 w-10" aria-hidden="true" />
        </div>

        <p className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Food<span className="text-brand-500">Supply</span>
        </p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          Dakar • B2B
        </p>

        {/* Barre de chargement + indicateur */}
        <div className="mt-8 flex w-48 flex-col items-center gap-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sky-400 to-brand-400 animate-splash-bar" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-brand-500"
            />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
