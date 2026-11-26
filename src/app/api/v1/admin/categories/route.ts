import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { categoryInputSchema, slugify } from "@/modules/catalog/schemas";
import { listAdminCategories } from "@/modules/catalog/admin-service";

export async function GET() {
  try {
    await requireApiPermission("catalog:manage");
    const categories = await listAdminCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger les catégories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("catalog:manage");
    const body = await request.json();
    const parsed = categoryInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données de catégorie invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = slugify(data.slug || data.name);
    if (!slug) {
      return NextResponse.json({ error: "Slug de catégorie invalide." }, { status: 400 });
    }

    const exists = await prisma.category.findFirst({
      where: { OR: [{ slug }, { name: data.name }] },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Une catégorie portant ce nom ou ce slug existe déjà." },
        { status: 409 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.create({
        data: {
          name: data.name,
          slug,
          description: data.description || null,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
          marginType: data.marginType ?? null,
          marginValue: data.marginType ? (data.marginValue ?? 0) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "CATEGORY_CREATED",
          entityType: "Category",
          entityId: cat.id,
          afterJson: cat,
        },
      });

      return cat;
    });

    revalidateTag("catalog");
    return NextResponse.json({ ok: true, category: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la création de la catégorie." }, { status: 500 });
  }
}
