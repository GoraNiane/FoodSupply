import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import {
  doesSubmissionFilenameBelongToSupplier,
  isSafeStoredFilename,
  readImageFromBucket,
} from "@/lib/storage/product-images";

/**
 * Les images brutes envoyées par les fournisseurs sont STRICTEMENT confidentielles :
 * seuls l'ADMIN et le FOURNISSEUR propriétaire peuvent les consulter.
 * Aucun visiteur ni client public ne peut y accéder.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { filename } = await context.params;
  if (!isSafeStoredFilename(filename)) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const isAdmin = user.roles.includes("ADMIN");
  if (!isAdmin) {
    if (!user.roles.includes("SUPPLIER") || !user.supplierId) {
      return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }
    const imageRecord = await prisma.supplierProductImage.findUnique({
      where: { storageKey: filename },
      include: { submission: { select: { supplierId: true } } },
    });

    if (imageRecord) {
      if (imageRecord.submission.supplierId !== user.supplierId) {
        return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
      }
    } else if (!doesSubmissionFilenameBelongToSupplier(filename, user.supplierId)) {
      return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }
  }

  const loaded = await readImageFromBucket("submissions", filename);
  if (!loaded) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(loaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": loaded.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
