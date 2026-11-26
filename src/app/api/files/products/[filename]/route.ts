import { NextResponse } from "next/server";
import {
  isSafeStoredFilename,
  readImageFromBucket,
} from "@/lib/storage/product-images";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  if (!isSafeStoredFilename(filename)) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const loaded = await readImageFromBucket("products", filename);
  if (!loaded) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(loaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": loaded.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
