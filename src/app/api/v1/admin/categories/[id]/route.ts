import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { categoryInputSchema, slugify } from "@/modules/catalog/schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = categoryInputSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }

    const data = parsed.data;
    const nextMarginType =
      data.marginType === undefined ? existing.marginType : data.marginType;
    const nextMarginValue =
      nextMarginType === null
        ? null
        : data.marginValue === undefined
          ? existing.marginValue
          : data.marginValue;

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined && data.slug.trim()
            ? { slug: slugify(data.slug) }
            : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          marginType: nextMarginType,
          marginValue: nextMarginValue,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "CATEGORY_UPDATED",
          entityType: "Category",
          entityId: cat.id,
          beforeJson: existing,
          afterJson: cat,
        },
      });

      return cat;
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true, category: updated });
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
    const actor = await requireApiPermission("catalog:manage");
    const { id } = await context.params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer cette catégorie car elle contient encore des produits. Désactivez-la ou déplacez d'abord ses produits.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.category.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "CATEGORY_DELETED",
          entityType: "Category",
          entityId: id,
          beforeJson: { name: existing.name, slug: existing.slug },
        },
      }),
    ]);

    revalidateTag("catalog");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
