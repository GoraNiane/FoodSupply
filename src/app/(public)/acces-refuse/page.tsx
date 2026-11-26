import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, buttonVariants } from "@/components/ui";

export const metadata: Metadata = {
  title: "Accès refusé",
};

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy-900">Accès non autorisé</h1>
        <p className="mt-2 text-sm text-slate-600">
          Votre compte ne dispose pas des droits requis pour accéder à cet espace.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Retour à l&apos;accueil
          </Link>
          <Link href="/portail" className={buttonVariants({ variant: "primary" })}>
            Mon espace
          </Link>
        </div>
      </Card>
    </div>
  );
}
