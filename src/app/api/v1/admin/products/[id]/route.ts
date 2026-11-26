import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { productWithOfferSchema } from "@/modules/catalog/schemas";
import { ensurePrimaryVendorSupplier } from "@/modules/catalog/admin-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = productWithOfferSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { offers: { orderBy: { createdAt: "asc" }, take: 1 } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    const data = parsed.data;
    const primaryOffer = existing.offers[0] ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.unitLabel !== undefined ? { unitLabel: data.unitLabel } : {}),
          ...(data.description !== undefined ? { description: data.description || null } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
          ...(data.origin !== undefined ? { origin: data.origin } : {}),
          ...(data.storageType !== undefined ? { storageType: data.storageType } : {}),
          ...(data.isFragile !== undefined ? { isFragile: data.isFragile } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.volumeTiers !== undefined
            ? { volumeTiers: data.volumeTiers ?? [] }
            : {}),
        },
      });

      const nextMarginType =
        data.marginTypeOverride === undefined
          ? primaryOffer?.marginTypeOverride ?? null
          : data.marginTypeOverride;
      const nextMarginValue =
        nextMarginType === null
          ? null
          : data.marginValueOverride === undefined
            ? primaryOffer?.marginValueOverride ?? 0
            : data.marginValueOverride;

      if (primaryOffer) {
        await tx.supplierOffer.update({
          where: { id: primaryOffer.id },
          data: {
            ...(data.supplierPriceXof !== undefined
              ? { supplierPriceXof: data.supplierPriceXof }
              : {}),
            ...(data.minOrderQty !== undefined ? { minOrderQty: data.minOrderQty } : {}),
            ...(data.stockQty !== undefined ? { stockQty: data.stockQty } : {}),
            ...(data.availability !== undefined ? { availability: data.availability } : {}),
            ...(data.leadTimeHours !== undefined ? { leadTimeHours: data.leadTimeHours } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            marginTypeOverride: nextMarginType,
            marginValueOverride: nextMarginValue,
          },
        });
      } else if (data.supplierPriceXof !== undefined) {
        const vendor = await ensurePrimaryVendorSupplier(actor.id);
        await tx.supplierOffer.create({
          data: {
            supplierId: vendor.id,
            productId: id,
            supplierPriceXof: data.supplierPriceXof,
            minOrderQty: data.minOrderQty ?? 1,
            stockQty: data.stockQty ?? null,
            availability: data.availability ?? "IN_STOCK",
            leadTimeHours: data.leadTimeHours ?? 12,
            marginTypeOverride: nextMarginType,
            marginValueOverride: nextMarginValue,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PRODUCT_UPDATED",
          entityType: "Product",
          entityId: id,
          beforeJson: {
            name: existing.name,
            isActive: existing.isActive,
            supplierPriceXof: primaryOffer?.supplierPriceXof ?? null,
          },
          afterJson: data,
        },
      });
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la mise à jour du produit." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const { id } = await context.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    // Ne jamais détruire physiquement un produit déjà présent dans des commandes historiques
    if (existing._count.orderItems > 0) {
      await prisma.$transaction([
        prisma.product.update({ where: { id }, data: { isActive: false } }),
        prisma.supplierOffer.updateMany({ where: { productId: id }, data: { isActive: false } }),
        prisma.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "PRODUCT_ARCHIVED",
            entityType: "Product",
            entityId: id,
            beforeJson: { name: existing.name, sku: existing.sku },
          },
        }),
      ]);
      revalidateTag("catalog");
      return NextResponse.json({
        ok: true,
        archived: true,
        message: "Ce produit figure dans des commandes existantes : il a été désactivé proprement.",
      });
    }

    await prisma.$transaction([
      prisma.supplierOffer.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PRODUCT_DELETED",
          entityType: "Product",
          entityId: id,
          beforeJson: { name: existing.name, sku: existing.sku },
        },
      }),
    ]);

    revalidateTag("catalog");
    return NextResponse.json({ ok: true, archived: false });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la suppression du produit." }, { status: 500 });
  }
}
