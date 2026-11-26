"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, ShoppingBag } from "lucide-react";
import { Alert, Button, FormField, Input } from "@/components/ui";
import type { LoginPortal } from "@/lib/permissions/rbac";

export function LoginForm({
  portal = "CLIENT",
  defaultCallbackUrl,
  placeholderEmail = "contact@monrestaurant.sn",
}: {
  portal?: LoginPortal;
  defaultCallbackUrl?: string;
  placeholderEmail?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackTarget =
    defaultCallbackUrl ??
    (portal === "ADMIN"
      ? "/admin"
      : portal === "SUPPLIER"
        ? "/fournisseur"
        : "/restaurant");
  const callbackUrl = searchParams.get("callbackUrl") || fallbackTarget;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        portal,
        redirect: false,
      });

      if (!result || result.error) {
        setError(
          portal === "ADMIN"
            ? "Identifiants administrateur invalides. Ce portail est réservé à l'administration FoodSupply."
            : portal === "SUPPLIER"
              ? "Identifiants fournisseur invalides. Vérifiez votre e-mail et mot de passe fournisseur."
              : "Identifiants client invalides."
        );
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Impossible de vous connecter pour le moment. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <Alert variant="danger" title="Connexion refusée">
          {error}
        </Alert>
      )}

      <FormField label="Email professionnel" htmlFor={`login-email-${portal}`} required>
        <Input
          id={`login-email-${portal}`}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholderEmail}
          required
        />
      </FormField>

      <FormField label="Mot de passe" htmlFor={`login-password-${portal}`} required>
        <div className="relative">
          <Input
            id={`login-password-${portal}`}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-navy-900"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </FormField>

      <div className="flex items-center justify-end">
        <Link
          href="/mot-de-passe-oublie"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading} loadingText="Connexion...">
        <Lock className="h-4 w-4" />
        {portal === "ADMIN"
          ? "Accéder à l'Administration"
          : portal === "SUPPLIER"
            ? "Accéder à mon espace fournisseur"
            : "Se connecter à mon espace client"}
      </Button>

      {portal === "CLIENT" && (
        <div className="rounded-xl border border-surface-border bg-surface-muted p-4 text-center">
          <p className="text-xs font-medium text-navy-900">
            Vous souhaitez commander rapidement sans créer de compte ?
          </p>
          <Link
            href="/catalogue"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Commander directement sans inscription
          </Link>
        </div>
      )}
    </form>
  );
}
