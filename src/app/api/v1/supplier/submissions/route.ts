import { NextResponse } from "next/server";
import { RoleCode, StorageType, SupplierSubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { isSafeStoredFilename } from "@/lib/storage/product-images";

const createSubmissionSchema = z.object({
  categoryId: z.string().trim().min(1, "Veuillez choisir une catégorie."),
  title: z.string().trim().min(2, "Nom du produit requis.").max(140),
  description: z.string().trim().min(10, "Décrivez la marchandise (10 caractères min).").max(2000),
  unitLabel: z.string().trim().min(2, "Unité de vente requise (ex: Plateau de 30, Sac 25 kg).").max(80),
  origin: z.string().trim().max(80).default("Sénégal"),
  storageType: z.nativeEnum(StorageType).default(StorageType.AMBIENT),
  isFragile: z.boolean().default(false),
  supplyPriceXof: z.coerce
    .number()
    .int("Le prix d'approvisionnement doit être un entier FCFA.")
    .min(50, "Prix minimum 50 FCFA.")
    .max(50000000),
  availableQty: z.coerce.number().int().min(0).max(1000000),
  minOrderQty: z.coerce.number().int().min(1).max(10000).default(1),
  isAvailable: z.boolean().default(true),
  images: z
    .array(
      z.object({
        storageKey: z.string().refine(isSafeStoredFilename, "Image invalide."),
        url: z.string().startsWith("/api/files/submissions/"),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
      })
    )
    .max(6, "Maximum 6 photos par produit.")
    .default([]),
});

export async function GET() {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId) {
      return NextResponse.json({ error: "Profil fournisseur introuvable." }, { status: 403 });
    }

    const submissions = await prisma.supplierProductSubmission.findMany({
      where: { supplierId: user.supplierId },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { displayOrder: "asc" } },
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger vos propositions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId) {
      return NextResponse.json({ error: "Profil fournisseur requis." }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: user.supplierId } });
    if (!supplier || supplier.verificationStatus === "SUSPENDED" || !supplier.isActive) {
      return NextResponse.json(
        { error: "Votre compte fournisseur est actuellement suspendu." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Veuillez corriger les informations du produit.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // RÈGLE ABSOLUE : Un fournisseur ne publie JAMAIS directement dans le catalogue public.
    // Statut initial forcé côté serveur : EN_ATTENTE_VALIDATION.
    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierProductSubmission.create({
        data: {
          supplierId: supplier.id,
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          unitLabel: data.unitLabel,
          origin: data.origin,
          storageType: data.storageType,
          isFragile: data.isFragile,
          supplyPriceXof: data.supplyPriceXof,
          availableQty: data.availableQty,
          minOrderQty: data.minOrderQty,
          isAvailable: data.isAvailable,
          status: SupplierSubmissionStatus.EN_ATTENTE_VALIDATION,
          images: {
            create: data.images.map((img, idx) => ({
              storageKey: img.storageKey,
              url: img.url,
              mimeType: img.mimeType,
              sizeBytes: img.sizeBytes,
              displayOrder: idx,
            })),
          },
        },
      });

      const admins = await tx.user.findMany({
        where: { status: "ACTIVE", roles: { some: { role: { code: RoleCode.ADMIN } } } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "NEW_SUBMISSION",
            title: `Nouvelle proposition produit : ${data.title}`,
            message: `${supplier.companyName} propose ${data.title} à ${data.supplyPriceXof} FCFA.`,
            linkUrl: `/admin/propositions/${created.id}`,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "SUPPLIER_PRODUCT_SUBMITTED",
          entityType: "SupplierProductSubmission",
          entityId: created.id,
          afterJson: {
            title: created.title,
            supplyPriceXof: created.supplyPriceXof,
            availableQty: created.availableQty,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la soumission du produit." }, { status: 500 });
  }
}
