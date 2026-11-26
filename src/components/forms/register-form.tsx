"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Alert, Button, FormField, Input, Select, useToast } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      businessName: String(formData.get("businessName") ?? ""),
      businessType: String(formData.get("businessType") ?? "RESTAURANT"),
      neighborhood: String(formData.get("neighborhood") ?? ""),
      street: String(formData.get("street") ?? ""),
      landmark: String(formData.get("landmark") ?? ""),
    };

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Impossible de créer le compte.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      notify({
        type: "success",
        title: "Compte client créé",
        description: "Connectez-vous pour retrouver vos adresses et votre historique.",
      });
      router.push("/connexion");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Alert variant="info" title="Inscription 100 % facultative">
        Vous pouvez aussi commander directement depuis le{" "}
        <Link href="/catalogue" className="font-semibold underline">
          catalogue sans créer de compte
        </Link>
        . Créer un compte vous permet simplement de sauvegarder vos adresses et factures.
      </Alert>

      {error && (
        <Alert variant="danger" title="Inscription impossible">
          {error}
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nom du responsable" htmlFor="reg-fullName" required error={fieldErrors.fullName?.[0]}>
          <Input id="reg-fullName" name="fullName" placeholder="Ex. Ibrahima Fall" required />
        </FormField>
        <FormField label="Téléphone (WhatsApp)" htmlFor="reg-phone" required error={fieldErrors.phone?.[0]}>
          <Input id="reg-phone" name="phone" type="tel" placeholder="+221 77 000 00 00" required />
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Nom de l'établissement"
          htmlFor="reg-businessName"
          required
          error={fieldErrors.businessName?.[0]}
        >
          <Input id="reg-businessName" name="businessName" placeholder="Ex. Fast-Food Dakar Grill" required />
        </FormField>

        <FormField label="Type d'activité" htmlFor="reg-businessType" required>
          <Select id="reg-businessType" name="businessType" defaultValue="RESTAURANT">
            <option value="RESTAURANT">Restaurant</option>
            <option value="FAST_FOOD">Fast-food</option>
            <option value="CREPERIE">Crêperie</option>
            <option value="BOULANGERIE">Boulangerie</option>
            <option value="PATISSERIE">Pâtisserie</option>
            <option value="HOTEL">Hôtel</option>
            <option value="TRAITEUR">Traiteur</option>
            <option value="ENTREPRISE_RESTAURATION">Entreprise de restauration</option>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Quartier (Dakar)" htmlFor="reg-neighborhood" required error={fieldErrors.neighborhood?.[0]}>
          <Input id="reg-neighborhood" name="neighborhood" placeholder="Ex. Almadies, Plateau, Mermoz" required />
        </FormField>
        <FormField label="Adresse / Rue" htmlFor="reg-street" required error={fieldErrors.street?.[0]}>
          <Input id="reg-street" name="street" placeholder="Ex. Route des Almadies, Zone 12" required />
        </FormField>
      </div>

      <FormField label="Repère de livraison (optionnel)" htmlFor="reg-landmark">
        <Input id="reg-landmark" name="landmark" placeholder="Ex. En face de la station Shell" />
      </FormField>

      <FormField label="Email professionnel" htmlFor="reg-email" required error={fieldErrors.email?.[0]}>
        <Input id="reg-email" name="email" type="email" placeholder="contact@monrestaurant.sn" required />
      </FormField>

      <FormField
        label="Mot de passe"
        htmlFor="reg-password"
        required
        hint="8 caractères minimum avec majuscule, minuscule et chiffre."
        error={fieldErrors.password?.[0]}
      >
        <Input id="reg-password" name="password" type="password" placeholder="••••••••" required />
      </FormField>

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading} loadingText="Création du compte...">
        <UserPlus className="h-4 w-4" />
        Créer mon compte client
      </Button>
    </form>
  );
}
