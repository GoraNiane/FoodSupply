import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { productWithOfferSchema, slugify } from "@/modules/catalog/schemas";
import {
  ensurePrimaryVendorSupplier,
  listAdminProducts,
} from "@/modules/catalog/admin-service";

export async function GET() {
  try {
    await requireApiPermission("catalog:manage");
    const products = await listAdminProducts();
    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger les produits." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const body = await request.json();
    const parsed = productWithOfferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Veuillez vérifier les champs du produit.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const baseSlug = slugify(data.name);
    const slug = `${baseSlug}-${data.sku.toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 90);

    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      return NextResponse.json(
        { error: "Un produit utilise déjà cette référence SKU." },
        { status: 409 }
      );
    }

    const vendorSupplier = await ensurePrimaryVendorSupplier(actor.id);

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          slug,
          sku: data.sku,
          unitLabel: data.unitLabel,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          origin: data.origin || "Sénégal",
          storageType: data.storageType,
          isFragile: data.isFragile,
          isActive: data.isActive,
          ...(data.volumeTiers !== undefined
            ? { volumeTiers: data.volumeTiers ?? [] }
            : {}),
        },
      });

      const offer = await tx.supplierOffer.create({
        data: {
          supplierId: vendorSupplier.id,
          productId: product.id,
          supplierPriceXof: data.supplierPriceXof,
          minOrderQty: data.minOrderQty,
          stockQty: data.stockQty ?? null,
          availability: data.availability,
          leadTimeHours: data.leadTimeHours,
          isActive: data.isActive,
          marginTypeOverride: data.marginTypeOverride ?? null,
          marginValueOverride: data.marginTypeOverride ? (data.marginValueOverride ?? 0) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PRODUCT_CREATED",
          entityType: "Product",
          entityId: product.id,
          afterJson: {
            sku: product.sku,
            name: product.name,
            supplierPriceXof: offer.supplierPriceXof,
          },
        },
      });

      return { product, offer };
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true, id: created.product.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la création du produit." }, { status: 500 });
  }
}
