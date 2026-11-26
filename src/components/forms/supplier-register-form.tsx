"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Alert, Button, FormField, Input, Select, Textarea, useToast } from "@/components/ui";

export function SupplierRegisterForm() {
  const router = useRouter();
  const { notify } = useToast();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") ?? ""),
      companyName: String(fd.get("companyName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      pickupNeighborhood: String(fd.get("pickupNeighborhood") ?? ""),
      pickupAddress: String(fd.get("pickupAddress") ?? ""),
      activityType: String(fd.get("activityType") ?? "GROSSISTE"),
      description: String(fd.get("description") ?? ""),
    };

    try {
      const res = await fetch("/api/v1/auth/register-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de finaliser l'inscription.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      notify({
        type: "success",
        title: "Compte fournisseur créé",
        description: "Connectez-vous à votre espace fournisseur pour soumettre vos produits.",
      });
      router.push("/connexion-fournisseur?registered=1");
    } catch {
      setError("Erreur réseau. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="danger" title="Inscription impossible">
          {error}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nom et prénom du responsable"
          htmlFor="sup-fullName"
          required
          error={fieldErrors.fullName?.[0]}
        >
          <Input id="sup-fullName" name="fullName" placeholder="Ex. Cheikh Tidiane Sarr" required />
        </FormField>

        <FormField
          label="Nom commercial ou raison sociale"
          htmlFor="sup-companyName"
          required
          error={fieldErrors.companyName?.[0]}
        >
          <Input id="sup-companyName" name="companyName" placeholder="Ex. AgroPlus Sénégal" required />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Numéro de téléphone"
          htmlFor="sup-phone"
          required
          error={fieldErrors.phone?.[0]}
        >
          <Input id="sup-phone" name="phone" type="tel" placeholder="+221 77 000 00 00" required />
        </FormField>

        <FormField
          label="Adresse e-mail"
          htmlFor="sup-email"
          required
          error={fieldErrors.email?.[0]}
        >
          <Input id="sup-email" name="email" type="email" placeholder="contact@monentreprise.sn" required />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Type d'activité"
          htmlFor="sup-activityType"
          required
          error={fieldErrors.activityType?.[0]}
        >
          <Select id="sup-activityType" name="activityType" defaultValue="GROSSISTE">
            <option value="PRODUCTEUR">Producteur agricole / maraîcher</option>
            <option value="ELEVEUR">Éleveur / Aviculture (œufs, volailles)</option>
            <option value="PECHEUR">Mareyeur / Pêche & Poissons</option>
            <option value="GROSSISTE">Grossiste / Distributeur alimentaire</option>
            <option value="IMPORTATEUR">Importateur alimentaire</option>
            <option value="TRANSFORMATEUR">Industrie / Transformateur / Moulin</option>
            <option value="EMBALLAGES">Fournisseur d&apos;emballages alimentaires</option>
            <option value="AUTRE">Autre activité alimentaire</option>
          </Select>
        </FormField>

        <FormField
          label="Quartier / Zone (Dakar ou région)"
          htmlFor="sup-neighborhood"
          required
          error={fieldErrors.pickupNeighborhood?.[0]}
        >
          <Input id="sup-neighborhood" name="pickupNeighborhood" placeholder="Ex. Thiaroye, Hann, Pikine, Rufisque" required />
        </FormField>
      </div>

      <FormField
        label="Adresse ou localisation de l'entreprise"
        htmlFor="sup-address"
        required
        error={fieldErrors.pickupAddress?.[0]}
      >
        <Input id="sup-address" name="pickupAddress" placeholder="Ex. Route de Rufisque Km 14, Entrepôt B2" required />
      </FormField>

      <FormField
        label="Description de l'activité et des produits proposés"
        htmlFor="sup-desc"
        required
        error={fieldErrors.description?.[0]}
      >
        <Textarea
          id="sup-desc"
          name="description"
          placeholder="Présentez vos produits phares, vos capacités hebdomadaires et conditions de stockage..."
          required
        />
      </FormField>

      <FormField
        label="Mot de passe"
        htmlFor="sup-password"
        required
        hint="8 caractères minimum avec 1 majuscule, 1 minuscule et 1 chiffre."
        error={fieldErrors.password?.[0]}
      >
        <Input id="sup-password" name="password" type="password" placeholder="••••••••" required />
      </FormField>

      <Button type="submit" size="lg" className="w-full" isLoading={isLoading} loadingText="Création du compte...">
        <Building2 className="h-4 w-4" />
        Créer mon compte fournisseur
      </Button>

      <p className="text-center text-xs text-slate-500">
        Déjà inscrit comme fournisseur ?{" "}
        <Link href="/connexion-fournisseur" className="font-semibold text-brand-600 hover:underline">
          Se connecter à mon espace fournisseur
        </Link>
      </p>
    </form>
  );
}
