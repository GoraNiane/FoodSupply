import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe commerciale et support FoodSupply à Dakar.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const defaultSubject = typeof sp.subject === "string" ? sp.subject : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-3">
        <Badge variant="brand">Support & Commercial Dakar</Badge>
        <h1 className="text-3xl font-extrabold text-navy-900">Contactez FoodSupply</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Une question sur un produit, un besoin d&apos;approvisionnement récurrent ou une
          candidature partenaire ? Écrivez-nous directement.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Card className="p-6 sm:p-8 lg:col-span-8">
          <ContactForm defaultSubject={defaultSubject} />
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <Card className="p-6">
            <h2 className="text-base font-bold text-navy-900">Coordonnées Dakar</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                <span>Sacré-Cœur 3, VDN, Dakar, Sénégal</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                <span>+221 33 820 45 00</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                <span>contact@foodsupply.sn</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                <span>Lundi – Samedi : 07h30 – 19h00 (Heure de Dakar)</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
