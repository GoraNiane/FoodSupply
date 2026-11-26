import Link from "next/link";
import { CheckCircle2, Clock, Eye, PackagePlus, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
import { Alert, Card, StatCard, VerificationStatusBadge, buttonVariants } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SupplierDashboardPage() {
  const user = await requirePageRole(["SUPPLIER"], "/connexion-fournisseur");

  const supplier = user.supplierId
    ? await prisma.supplier.findUnique({ where: { id: user.supplierId } })
    : null;

  const submissions = user.supplierId
    ? await prisma.supplierProductSubmission.findMany({
        where: { supplierId: user.supplierId },
        select: { status: true },
      })
    : [];

  const pendingCount = submissions.filter((s) => s.status === "EN_ATTENTE_VALIDATION").length;
  const reviewCount = submissions.filter((s) => s.status === "EN_COURS_EXAMEN").length;
  const approvedCount = submissions.filter((s) => s.status === "APPROUVE").length;
  const rejectedCount = submissions.filter(
    (s) => s.status === "REFUSE" || s.status === "SUSPENDU"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900">
              Bonjour, {supplier?.companyName ?? user.fullName}
            </h1>
            {supplier && <VerificationStatusBadge status={supplier.verificationStatus} />}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Soumettez vos produits, photos, quantités et prix d&apos;approvisionnement à l&apos;équipe
            FoodSupply.
          </p>
        </div>

        <Link href="/fournisseur/produits" className={buttonVariants({ variant: "primary" })}>
          <PackagePlus className="h-4 w-4" />
          Proposer un produit
        </Link>
      </div>

      {supplier?.verificationStatus === "SUSPENDED" && (
        <Alert variant="danger" title="Compte suspendu">
          Votre compte fournisseur est actuellement suspendu par l&apos;administration FoodSupply.
          Contactez notre équipe pour plus d&apos;informations.
        </Alert>
      )}

      <Alert variant="info" title="Fonctionnement partenaire FoodSupply">
        Tous les produits que vous soumettez sont examinés par l&apos;administration FoodSupply
        avant toute mise en vente au catalogue public. Vos prix d&apos;approvisionnement et
        coordonnées restent strictement confidentiels.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="En attente de validation"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          title="En cours d'examen"
          value={reviewCount}
          icon={<Eye className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          title="Produits approuvés"
          value={approvedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="Refusés / Suspendus"
          value={rejectedCount}
          icon={<XCircle className="h-5 w-5" />}
          accent="danger"
        />
      </div>

      <Card className="p-6">
        <h2 className="text-base font-bold text-ink-900">Actions rapides</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/fournisseur/produits" className={buttonVariants({ variant: "primary" })}>
            Soumettre ou gérer mes produits
          </Link>
          <Link href="/fournisseur/profil" className={buttonVariants({ variant: "outline" })}>
            Compléter mon profil entreprise
          </Link>
        </div>
      </Card>
    </div>
  );
}
