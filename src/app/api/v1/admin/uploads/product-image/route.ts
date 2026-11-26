import { NextResponse } from "next/server";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { saveProductImageLocally } from "@/lib/storage/product-images";

export async function POST(request: Request) {
  try {
    await requireApiPermission("catalog:manage");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Veuillez sélectionner un fichier image (JPG, PNG ou WEBP)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const saved = await saveProductImageLocally(buffer);

    return NextResponse.json(
      {
        ok: true,
        imageUrl: saved.publicUrl,
        mime: saved.mime,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Erreur lors du téléversement de l'image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
