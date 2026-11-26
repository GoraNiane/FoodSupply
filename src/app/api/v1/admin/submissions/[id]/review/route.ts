import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { AvailabilityStatus, MarginType, SupplierSubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { slugify } from "@/modules/catalog/schemas";
import { promoteSubmissionImageToCatalog } from "@/lib/storage/product-images";

const reviewSubmissionSchema = z.object({
  status: z.nativeEnum(SupplierSubmissionStatus),
  negotiatedPriceXof: z.coerce.number().int().min(0).max(50000000).optional(),
  adminReviewNote: z.string().trim().max(1000).optional().nullable(),
  // Champs utilisés lorsque l'Admin approuve & publie dans le catalogue public FoodSupply
  publishToCatalog: z.boolean().default(false),
  publicTitle: z.string().trim().min(2).max(140).optional(),
  publicDescription: z.string().trim().max(2000).optional().nullable(),
  publicUnitLabel: z.string().trim().min(2).max(80).optional(),
  publicClientPriceXof: z.coerce.number().int().min(50).max(50000000).optional(),
  selectedImageIds: z.array(z.string()).default([]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireApiPermission("catalog:manage");
    const { id } = await context.params;
    const body = await request.json();
    const parsed = reviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données d'examen invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const submission = await prisma.supplierProductSubmission.findUnique({
      where: { id },
      include: {
        supplier: true,
        images: { orderBy: { displayOrder: "asc" } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
    }

    const data = parsed.data;
    const negotiatedCostXof = data.negotiatedPriceXof ?? submission.supplyPriceXof;

    // Promotion sécurisée des photos privées sélectionnées vers le stockage public catalogue
    let promotedPrimaryImageUrl: string | null = null;
    const promotedGalleryUrls: string[] = [];

    if (data.status === SupplierSubmissionStatus.APPROUVE && data.publishToCatalog) {
      const chosenImages =
        data.selectedImageIds.length > 0
          ? submission.images.filter((img) => data.selectedImageIds.includes(img.id))
          : submission.images.slice(0, 1);

      for (const img of chosenImages) {
        const publicUrl = await promoteSubmissionImageToCatalog(img.storageKey);
        if (publicUrl) {
          promotedGalleryUrls.push(publicUrl);
        }
      }
      promotedPrimaryImageUrl = promotedGalleryUrls[0] ?? null;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Marquer les images sélectionnées
      if (data.selectedImageIds.length > 0) {
        await tx.supplierProductImage.updateMany({
          where: { submissionId: submission.id },
          data: { isSelectedForCatalog: false },
        });
        await tx.supplierProductImage.updateMany({
          where: { submissionId: submission.id, id: { in: data.selectedImageIds } },
          data: { isSelectedForCatalog: true },
        });
      }

      let publishedProductId = submission.publishedProductId;

      if (data.status === SupplierSubmissionStatus.APPROUVE && data.publishToCatalog) {
        const publicTitle = data.publicTitle || submission.title;
        const publicUnit = data.publicUnitLabel || submission.unitLabel;
        const publicDesc =
          data.publicDescription !== undefined ? data.publicDescription : submission.description;
        const publicClientPrice =
          data.publicClientPriceXof ?? Math.round(negotiatedCostXof * 1.15);

        const safeCost = Math.min(negotiatedCostXof, publicClientPrice);
        const fixedMargin = Math.max(0, publicClientPrice - safeCost);

        // Approuver le fournisseur en interne si besoin pour activer son approvisionnement en coulisses
        if (submission.supplier.verificationStatus !== "APPROVED") {
          await tx.supplier.update({
            where: { id: submission.supplierId },
            data: {
              verificationStatus: "APPROVED",
              verifiedAt: new Date(),
              verifiedById: admin.id,
            },
          });
        }

        if (publishedProductId) {
          await tx.product.update({
            where: { id: publishedProductId },
            data: {
              name: publicTitle,
              unitLabel: publicUnit,
              description: publicDesc,
              ...(promotedPrimaryImageUrl ? { imageUrl: promotedPrimaryImageUrl } : {}),
              ...(promotedGalleryUrls.length > 0 ? { galleryUrls: promotedGalleryUrls } : {}),
              isActive: true,
            },
          });
        } else {
          const sku = `FS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
          const slug = `${slugify(publicTitle)}-${sku.toLowerCase()}`.slice(0, 90);
          const createdProduct = await tx.product.create({
            data: {
              categoryId: submission.categoryId,
              name: publicTitle,
              slug,
              sku,
              unitLabel: publicUnit,
              description: publicDesc,
              origin: submission.origin,
              storageType: submission.storageType,
              isFragile: submission.isFragile,
              imageUrl: promotedPrimaryImageUrl,
              galleryUrls: promotedGalleryUrls.length > 0 ? promotedGalleryUrls : undefined,
              isActive: true,
            },
          });
          publishedProductId = createdProduct.id;
        }

        await tx.supplierOffer.upsert({
          where: {
            supplierId_productId: {
              supplierId: submission.supplierId,
              productId: publishedProductId,
            },
          },
          update: {
            supplierPriceXof: safeCost,
            marginTypeOverride: MarginType.FIXED_XOF,
            marginValueOverride: fixedMargin,
            stockQty: submission.availableQty,
            minOrderQty: submission.minOrderQty,
            availability: submission.isAvailable
              ? AvailabilityStatus.IN_STOCK
              : AvailabilityStatus.ON_CONFIRMATION,
            isActive: true,
          },
          create: {
            supplierId: submission.supplierId,
            productId: publishedProductId,
            supplierPriceXof: safeCost,
            marginTypeOverride: MarginType.FIXED_XOF,
            marginValueOverride: fixedMargin,
            stockQty: submission.availableQty,
            minOrderQty: submission.minOrderQty,
            availability: submission.isAvailable
              ? AvailabilityStatus.IN_STOCK
              : AvailabilityStatus.ON_CONFIRMATION,
            isActive: true,
          },
        });
      } else if (
        (data.status === SupplierSubmissionStatus.SUSPENDU ||
          data.status === SupplierSubmissionStatus.REFUSE) &&
        publishedProductId
      ) {
        // Retire automatiquement l'offre du catalogue si la proposition est suspendue ou refusée
        await tx.supplierOffer.updateMany({
          where: { supplierId: submission.supplierId, productId: publishedProductId },
          data: { isActive: false },
        });
      }

      const updatedSubmission = await tx.supplierProductSubmission.update({
        where: { id: submission.id },
        data: {
          status: data.status,
          negotiatedPriceXof: negotiatedCostXof,
          adminReviewNote: data.adminReviewNote ?? null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          publishedProductId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: "ADMIN_SUBMISSION_REVIEWED",
          entityType: "SupplierProductSubmission",
          entityId: submission.id,
          beforeJson: { status: submission.status, supplyPriceXof: submission.supplyPriceXof },
          afterJson: {
            status: data.status,
            negotiatedPriceXof: negotiatedCostXof,
            publishedProductId,
          },
        },
      });

      return updatedSubmission;
    });

    revalidateTag("catalog");
    return NextResponse.json({
      ok: true,
      status: result.status,
      publishedProductId: result.publishedProductId,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Erreur lors de l'examen de la proposition." },
      { status: 500 }
    );
  }
}
