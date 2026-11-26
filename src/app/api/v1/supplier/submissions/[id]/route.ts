import { NextResponse } from "next/server";
import { SupplierSubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const updateSupplierSubmissionSchema = z.object({
  supplyPriceXof: z.coerce.number().int().min(50).max(50000000).optional(),
  availableQty: z.coerce.number().int().min(0).max(1000000).optional(),
  isAvailable: z.boolean().optional(),
  description: z.string().trim().min(10).max(2000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId) {
      return NextResponse.json({ error: "Compte fournisseur requis." }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.supplierProductSubmission.findUnique({ where: { id } });

    if (!existing || existing.supplierId !== user.supplierId) {
      return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSupplierSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    // Si le fournisseur modifie le prix sur un produit déjà refusé, il repart en attente de validation
    const resetStatus =
      existing.status === SupplierSubmissionStatus.REFUSE
        ? SupplierSubmissionStatus.EN_ATTENTE_VALIDATION
        : existing.status;

    const updated = await prisma.supplierProductSubmission.update({
      where: { id },
      data: {
        ...(parsed.data.supplyPriceXof !== undefined
          ? { supplyPriceXof: parsed.data.supplyPriceXof }
          : {}),
        ...(parsed.data.availableQty !== undefined
          ? { availableQty: parsed.data.availableQty }
          : {}),
        ...(parsed.data.isAvailable !== undefined ? { isAvailable: parsed.data.isAvailable } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        status: resetStatus,
      },
    });

    return NextResponse.json({ ok: true, submission: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId) {
      return NextResponse.json({ error: "Compte fournisseur requis." }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.supplierProductSubmission.findUnique({ where: { id } });
    if (!existing || existing.supplierId !== user.supplierId) {
      return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
    }

    if (existing.status === SupplierSubmissionStatus.APPROUVE) {
      return NextResponse.json(
        {
          error:
            "Cette proposition est déjà approuvée par FoodSupply. Indiquez plutôt qu'elle est indisponible (stock 0).",
        },
        { status: 409 }
      );
    }

    await prisma.supplierProductSubmission.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
