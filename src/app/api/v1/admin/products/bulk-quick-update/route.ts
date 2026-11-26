import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { MarginType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { bulkQuickProductUpdateSchema } from "@/modules/catalog/schemas";

/**
 * Mise à jour ultra-rapide des prix du matin, stocks et disponibilités en un seul clic.
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const body = await request.json();
    const parsed = bulkQuickProductUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données de mise à jour invalides." },
        { status: 400 }
      );
    }

    const updates = parsed.data.updates;
    const productIds = updates.map((u) => u.productId);

    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        offers: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    });
    const byId = new Map(existingProducts.map((p) => [p.id, p]));

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const product = byId.get(item.productId);
        if (!product) continue;

        await tx.product.update({
          where: { id: product.id },
          data: { isActive: item.isActive },
        });

        const primaryOffer = product.offers[0];
        if (primaryOffer) {
          // Calcule le delta de marge fixe pour refléter exactement le nouveau prix client choisi
          const fixedMargin = Math.max(0, item.clientUnitPriceXof - primaryOffer.supplierPriceXof);
          const nextSupplierPrice =
            item.clientUnitPriceXof < primaryOffer.supplierPriceXof
              ? item.clientUnitPriceXof
              : primaryOffer.supplierPriceXof;

          await tx.supplierOffer.update({
            where: { id: primaryOffer.id },
            data: {
              supplierPriceXof: nextSupplierPrice,
              marginTypeOverride: MarginType.FIXED_XOF,
              marginValueOverride: fixedMargin,
              availability: item.availability,
              stockQty: item.stockQty ?? null,
              isActive: item.isActive,
            },
          });
        }
        updatedCount++;
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PRODUCTS_BULK_QUICK_UPDATED",
          entityType: "Product",
          entityId: "bulk",
          afterJson: { count: updatedCount },
        },
      });
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true, updatedCount });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'appliquer la mise à jour rapide." },
      { status: 500 }
    );
  }
}
