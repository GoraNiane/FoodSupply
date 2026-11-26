import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import type { SupplierSubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  Card,
  EmptyState,
  SubmissionStatusBadge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  buttonVariants,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Propositions fournisseurs",
};

const FILTERS: Array<{ label: string; status?: SupplierSubmissionStatus }> = [
  { label: "Toutes" },
  { label: "En attente", status: "EN_ATTENTE_VALIDATION" },
  { label: "En examen", status: "EN_COURS_EXAMEN" },
  { label: "Approuvées", status: "APPROUVE" },
  { label: "Refusées", status: "REFUSE" },
  { label: "Suspendues", status: "SUSPENDU" },
];

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter =
    typeof sp.status === "string" && sp.status
      ? (sp.status as SupplierSubmissionStatus)
      : undefined;

  const submissions = await prisma.supplierProductSubmission.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { companyName: true, pickupNeighborhood: true } },
      category: { select: { name: true } },
      images: { orderBy: { displayOrder: "asc" }, take: 1 },
      _count: { select: { images: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Propositions produits des fournisseurs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Examinez les photos originales, négociez les prix d&apos;achat, fixez votre prix public
          FoodSupply et décidez seuls des produits publiés au catalogue.
        </p>
      </div>

      <Card className="flex flex-wrap gap-2 p-4">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.status ? `/admin/propositions?status=${f.status}` : "/admin/propositions"}
            className={buttonVariants({
              variant: statusFilter === f.status ? "navy" : "outline",
              size: "sm",
            })}
          >
            {f.label}
          </Link>
        ))}
      </Card>

      {submissions.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Proposition</TableHeaderCell>
                <TableHeaderCell>Fournisseur (Privé)</TableHeaderCell>
                <TableHeaderCell>Prix d&apos;achat proposé</TableHeaderCell>
                <TableHeaderCell>Qté disponible</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {sub.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sub.images[0].url}
                          alt={sub.title}
                          className="h-11 w-11 rounded-lg border border-surface-border object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                          {sub.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-ink-900">{sub.title}</p>
                        <p className="text-xs text-slate-500">
                          {sub.category.name} • {sub.unitLabel} • {sub._count.images} photo(s)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateDakar(sub.createdAt, true)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-ink-900">{sub.supplier.companyName}</p>
                    <p className="text-xs text-slate-500">{sub.supplier.pickupNeighborhood}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-ink-900">{formatXof(sub.supplyPriceXof)}</p>
                    {sub.negotiatedPriceXof && sub.negotiatedPriceXof !== sub.supplyPriceXof && (
                      <p className="text-xs font-semibold text-success-600">
                        Négocié : {formatXof(sub.negotiatedPriceXof)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{sub.availableQty}</TableCell>
                  <TableCell>
                    <SubmissionStatusBadge status={sub.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/propositions/${sub.id}`}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      Examiner
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          icon={<Inbox className="h-7 w-7" />}
          title="Aucune proposition fournisseur dans cette vue"
          description="Les produits soumis librement par vos fournisseurs depuis /fournisseur apparaîtront ici pour examen."
        />
      )}
    </div>
  );
}
