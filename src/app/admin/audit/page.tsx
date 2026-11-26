import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDateDakar } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal d'audit",
};

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      actor: {
        select: { fullName: true, email: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Journal d&apos;audit & traçabilité</h1>
        <p className="mt-1 text-sm text-slate-600">
          Historique immuable des 150 dernières opérations critiques (commandes, paiements,
          remboursements, validation fournisseurs et paramètres).
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Aucune entrée d'audit"
          description="Les opérations administratives sensibles sont enregistrées automatiquement ici."
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date (Dakar)</TableHeaderCell>
                <TableHeaderCell>Acteur</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Entité</TableHeaderCell>
                <TableHeaderCell>Détails</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {formatDateDakar(log.createdAt, true)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.actor ? (
                      <div>
                        <p className="font-semibold text-navy-900">{log.actor.fullName}</p>
                        <p className="text-slate-500">{log.actor.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Système / Invité</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="navy">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {log.entityType}
                    <span className="block text-[11px] text-slate-400">{log.entityId}</span>
                  </TableCell>
                  <TableCell className="max-w-md truncate font-mono text-[11px] text-slate-500">
                    {log.afterJson ? JSON.stringify(log.afterJson).slice(0, 140) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
