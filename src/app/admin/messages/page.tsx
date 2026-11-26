import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { AdminMessagesClient } from "@/components/admin/admin-messages-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages & Demandes Contact",
};

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Messages reçus (/contact)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Toutes les demandes clients, hôtels, traiteurs et partenaires envoyées depuis le formulaire
          de contact public.
        </p>
      </div>

      <AdminMessagesClient
        messages={messages.map((m) => ({
          id: m.id,
          reference: m.reference,
          fullName: m.fullName,
          companyName: m.companyName,
          email: m.email,
          phone: m.phone,
          profileType: m.profileType,
          subject: m.subject,
          message: m.message,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
