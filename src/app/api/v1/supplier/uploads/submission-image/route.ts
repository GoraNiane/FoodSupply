import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { saveSubmissionImageLocally } from "@/lib/storage/product-images";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId && !user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Compte fournisseur requis." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Veuillez sélectionner une photo (JPG, PNG ou WEBP)." },
        { status: 400 }
      );
    }

    const ownerId = user.supplierId ?? user.id;
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveSubmissionImageLocally(buffer, ownerId);

    return NextResponse.json(
      {
        ok: true,
        storageKey: saved.filename,
        url: saved.url,
        mimeType: saved.mime,
        sizeBytes: saved.sizeBytes,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur d'upload." },
      { status: 400 }
    );
  }
}
