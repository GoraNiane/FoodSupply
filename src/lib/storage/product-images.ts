import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma/client";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo

export type AllowedImageFormat = {
  ext: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function detectImageFormatFromMagicBytes(buffer: Buffer): AllowedImageFormat | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

export function getStorageBucketDir(bucket: "products" | "submissions"): string {
  const baseDir = process.env.LOCAL_STORAGE_DIR || "./storage";
  return path.resolve(process.cwd(), baseDir, bucket);
}

export function getProductsStorageDir(): string {
  return getStorageBucketDir("products");
}

export function isSafeStoredFilename(filename: string): boolean {
  return /^[a-zA-Z0-9_-]{8,120}\.(jpg|png|webp)$/.test(filename);
}

/**
 * Vérifie qu'un fichier de soumission appartient bien au fournisseur connecté
 * même avant l'enregistrement définitif de la soumission en base (défense en profondeur).
 */
export function doesSubmissionFilenameBelongToSupplier(
  filename: string,
  supplierId: string
): boolean {
  const safeOwner = supplierId.replace(/[^a-zA-Z0-9]/g, "");
  if (!safeOwner) return false;
  return filename.startsWith(`sub_${safeOwner}_`);
}

function shouldUseCloudStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.VERCEL === "1";
}

async function saveImageToBucket(
  buffer: Buffer,
  bucket: "products" | "submissions",
  ownerTag?: string
): Promise<{
  filename: string;
  mime: string;
  sizeBytes: number;
  url: string;
}> {
  if (buffer.length === 0) {
    throw new Error("Le fichier image est vide.");
  }
  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("L'image dépasse la taille maximale autorisée de 5 Mo.");
  }

  const format = detectImageFormatFromMagicBytes(buffer);
  if (!format) {
    throw new Error("Format d'image non supporté. Utilisez JPG, PNG ou WEBP.");
  }

  const uuid = crypto.randomUUID().replace(/-/g, "");
  const safeOwner = ownerTag ? ownerTag.replace(/[^a-zA-Z0-9]/g, "") : "";
  const filename =
    bucket === "products"
      ? `prod_${uuid}.${format.ext}`
      : safeOwner
        ? `sub_${safeOwner}_${uuid}.${format.ext}`
        : `sub_${uuid}.${format.ext}`;

  if (shouldUseCloudStorage()) {
    // Images publiques du catalogue : Vercel Blob CDN si BLOB_READ_WRITE_TOKEN configuré, sinon TiDB StoredMedia
    if (bucket === "products" && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`foodsupply/products/${filename}`, buffer, {
        access: "public",
        contentType: format.mime,
        addRandomSuffix: false,
      });

      await prisma.storedMedia.create({
        data: {
          storageKey: filename,
          bucket,
          mimeType: format.mime,
          sizeBytes: buffer.length,
          blobUrl: blob.url,
        },
      });

      return {
        filename,
        mime: format.mime,
        sizeBytes: buffer.length,
        url: blob.url,
      };
    }

    // Images privées fournisseurs (ou fallback Vercel sans Blob token) : stockage persistant privé en TiDB
    await prisma.storedMedia.create({
      data: {
        storageKey: filename,
        bucket,
        mimeType: format.mime,
        sizeBytes: buffer.length,
        data: new Uint8Array(buffer),
      },
    });

    return {
      filename,
      mime: format.mime,
      sizeBytes: buffer.length,
      url: `/api/files/${bucket}/${filename}`,
    };
  }

  // Développement local : écriture rapide sur disque local
  const dir = getStorageBucketDir(bucket);
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);

  return {
    filename,
    mime: format.mime,
    sizeBytes: buffer.length,
    url: `/api/files/${bucket}/${filename}`,
  };
}

/**
 * Lit une image depuis le disque local (dev) ou depuis TiDB StoredMedia / Vercel Blob (production).
 */
export async function readImageFromBucket(
  bucket: "products" | "submissions",
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!isSafeStoredFilename(filename)) return null;

  // 1. Essai disque local (instantané en dev)
  const fullPath = path.join(getStorageBucketDir(bucket), filename);
  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(filename).toLowerCase();
    return { buffer: data, mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream" };
  } catch {
    // Continue vers le stockage cloud/DB
  }

  // 2. Essai TiDB StoredMedia / Vercel Blob
  try {
    const media = await prisma.storedMedia.findUnique({
      where: { storageKey: filename },
    });
    if (!media || media.bucket !== bucket) return null;

    if (media.data) {
      return { buffer: Buffer.from(media.data), mimeType: media.mimeType };
    }
    if (media.blobUrl) {
      const res = await fetch(media.blobUrl);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return { buffer: Buffer.from(arr), mimeType: media.mimeType };
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveProductImageLocally(buffer: Buffer) {
  const saved = await saveImageToBucket(buffer, "products");
  return {
    filename: saved.filename,
    mime: saved.mime,
    publicUrl: saved.url,
  };
}

export async function saveSubmissionImageLocally(buffer: Buffer, ownerSupplierId: string) {
  return saveImageToBucket(buffer, "submissions", ownerSupplierId);
}

/**
 * Copie une photo privée soumise par un fournisseur vers le dossier/CDN public catalogue
 * uniquement lorsque l'administrateur approuve et publie le produit.
 */
export async function promoteSubmissionImageToCatalog(storageKey: string): Promise<string | null> {
  const loaded = await readImageFromBucket("submissions", storageKey);
  if (!loaded) return null;
  try {
    const saved = await saveProductImageLocally(loaded.buffer);
    return saved.publicUrl;
  } catch {
    return null;
  }
}
