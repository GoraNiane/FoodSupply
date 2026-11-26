import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  title: "Créer un compte client",
  description: "Créez un compte client facultatif FoodSupply pour sauvegarder vos adresses et factures.",
};

export default function RegisterPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Compte client professionnel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Facultatif — retrouvez vos commandes, favoris et factures PDF
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-subtle p-1 text-center text-sm font-medium">
        <Link
          href="/connexion"
          className="rounded-lg py-2 text-slate-500 transition-colors hover:text-navy-900"
        >
          Connexion
        </Link>
        <span className="rounded-lg bg-white py-2 font-semibold text-navy-900 shadow-xs">
          Compte client
        </span>
      </div>

      <RegisterForm />
    </Card>
  );
}
