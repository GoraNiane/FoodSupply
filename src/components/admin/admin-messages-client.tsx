"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, MessageCircle, Phone } from "lucide-react";
import { Badge, Button, Card, EmptyState, useToast } from "@/components/ui";
import { buildWhatsAppLink } from "@/modules/notifications/whatsapp";
import { formatDateDakar } from "@/lib/utils/format";

export interface AdminContactMessageRow {
  id: string;
  reference: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  profileType: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export function AdminMessagesClient({ messages }: { messages: AdminContactMessageRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function updateStatus(id: string, status: "READ" | "REPLIED") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        notify({ type: "success", title: status === "REPLIED" ? "Marqué répondu" : "Marqué lu" });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="h-6 w-6" />}
        title="Aucun message reçu"
        description="Les demandes envoyées via la page publique /contact s'enregistrent automatiquement ici."
      />
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const waUrl = buildWhatsAppLink(
          m.phone,
          `Bonjour ${m.fullName}, suite à votre message FoodSupply Dakar (${m.reference} — ${m.subject}) : `
        );
        return (
          <Card
            key={m.id}
            className={`p-5 ${m.status === "NEW" ? "border-brand-300 bg-brand-50/30" : "bg-white"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{m.reference}</span>
                  <Badge
                    variant={
                      m.status === "NEW" ? "brand" : m.status === "REPLIED" ? "success" : "neutral"
                    }
                  >
                    {m.status === "NEW" ? "Nouveau" : m.status === "REPLIED" ? "Répondu" : "Lu"}
                  </Badge>
                  <Badge variant="navy">{m.profileType}</Badge>
                </div>
                <h2 className="mt-1.5 text-base font-bold text-navy-900">{m.subject}</h2>
                <p className="text-xs text-slate-600">
                  <strong>{m.fullName}</strong> • {m.companyName} • {m.email} • {m.phone} •{" "}
                  {formatDateDakar(m.createdAt, true)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success-600 px-3 text-xs font-semibold text-white hover:bg-success-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Répondre WhatsApp
                  </a>
                )}
                <a
                  href={`tel:${m.phone}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Appeler
                </a>
                {m.status !== "REPLIED" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={busyId === m.id}
                    onClick={() => updateStatus(m.id, "REPLIED")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Marquer traité
                  </Button>
                )}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted p-3.5 text-sm text-slate-700">
              {m.message}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
