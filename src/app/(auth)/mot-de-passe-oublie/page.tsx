"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Alert, Button, Card, FormField, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de traiter votre demande.");
      } else {
        setMessage(data.message);
      }
    } catch {
      setError("Erreur réseau. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-navy-900">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-slate-500">
        Saisissez votre email professionnel pour recevoir un lien sécurisé de réinitialisation.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {message && (
          <Alert variant="success" title="Demande prise en compte">
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" title="Erreur">
            {error}
          </Alert>
        )}

        <FormField label="Email professionnel" htmlFor="forgot-email" required>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.sn"
            required
          />
        </FormField>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          <Mail className="h-4 w-4" />
          Envoyer le lien de réinitialisation
        </Button>

        <p className="text-center text-xs text-slate-500">
          <Link href="/connexion" className="font-semibold text-brand-600 hover:text-brand-700">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </Card>
  );
}
