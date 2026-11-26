"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Alert, Button, FormField, Input, Select, Textarea, useToast } from "@/components/ui";

export function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const { notify } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      profileType: String(formData.get("profileType") ?? "RESTAURANT"),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error ?? "Veuillez vérifier les champs saisis.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setServerSuccess(`${data.message} (Référence : ${data.reference})`);
      notify({
        type: "success",
        title: "Message envoyé",
        description: `Référence ${data.reference}`,
      });
      form.reset();
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer dans quelques instants.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {serverSuccess && (
        <Alert variant="success" title="Demande enregistrée">
          {serverSuccess}
        </Alert>
      )}
      {serverError && (
        <Alert variant="danger" title="Impossible d'envoyer le message">
          {serverError}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nom complet" htmlFor="fullName" required error={fieldErrors.fullName?.[0]}>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Ex. Ibrahima Fall"
            hasError={Boolean(fieldErrors.fullName)}
            required
          />
        </FormField>

        <FormField
          label="Établissement / Entreprise"
          htmlFor="companyName"
          required
          error={fieldErrors.companyName?.[0]}
        >
          <Input
            id="companyName"
            name="companyName"
            placeholder="Ex. Restaurant Le Bon Goût"
            hasError={Boolean(fieldErrors.companyName)}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Email professionnel"
          htmlFor="email"
          required
          error={fieldErrors.email?.[0]}
        >
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="contact@etablissement.sn"
            hasError={Boolean(fieldErrors.email)}
            required
          />
        </FormField>

        <FormField label="Téléphone" htmlFor="phone" required error={fieldErrors.phone?.[0]}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+221 77 000 00 00"
            hasError={Boolean(fieldErrors.phone)}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Votre profil" htmlFor="profileType" required>
          <Select id="profileType" name="profileType" defaultValue="RESTAURANT">
            <option value="RESTAURANT">Restaurant / Fast-food / Hôtel / Traiteur</option>
            <option value="SUPPLIER">Fournisseur / Grossiste alimentaire</option>
            <option value="DRIVER">Livreur partenaire</option>
            <option value="AUTRE">Autre demande</option>
          </Select>
        </FormField>

        <FormField label="Objet" htmlFor="subject" required error={fieldErrors.subject?.[0]}>
          <Input
            id="subject"
            name="subject"
            defaultValue={defaultSubject}
            placeholder="Ex. Demande de devis ou question produit"
            hasError={Boolean(fieldErrors.subject)}
            required
          />
        </FormField>
      </div>

      <FormField label="Message" htmlFor="message" required error={fieldErrors.message?.[0]}>
        <Textarea
          id="message"
          name="message"
          placeholder="Précisez vos besoins (produits, volumes hebdomadaires, quartier à Dakar)..."
          hasError={Boolean(fieldErrors.message)}
          required
        />
      </FormField>

      <Button type="submit" isLoading={isSubmitting} loadingText="Envoi en cours..." size="lg">
        <Send className="h-4 w-4" />
        Envoyer ma demande
      </Button>
    </form>
  );
}
