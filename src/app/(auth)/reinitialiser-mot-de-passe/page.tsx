"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Alert, Button, Card, FormField, Input } from "@/components/ui";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lien invalide ou expiré.");
      } else {
        setSuccess(data.message);
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="danger" title="Lien incomplet">
        Le jeton de réinitialisation est manquant. Demandez un nouveau lien depuis la page{" "}
        <Link href="/mot-de-passe-oublie" className="font-semibold underline">
          Mot de passe oublié
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {success && (
        <Alert variant="success" title="Mot de passe réinitialisé">
          {success}{" "}
          <Link href="/connexion" className="font-semibold underline">
            Se connecter maintenant
          </Link>
        </Alert>
      )}
      {error && (
        <Alert variant="danger" title="Réinitialisation impossible">
          {error}
        </Alert>
      )}

      <FormField
        label="Nouveau mot de passe"
        htmlFor="reset-password"
        required
        hint="8 caractères minimum avec majuscule, minuscule et chiffre."
      >
        <Input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Confirmer le mot de passe" htmlFor="reset-confirm" required>
        <Input
          id="reset-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </FormField>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        <KeyRound className="h-4 w-4" />
        Mettre à jour mon mot de passe
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-navy-900">Réinitialiser le mot de passe</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choisissez un nouveau mot de passe sécurisé pour votre compte FoodSupply.
      </p>
      <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-xl bg-surface-subtle" />}>
        <ResetPasswordInner />
      </Suspense>
    </Card>
  );
}
