import { describe, expect, it } from "vitest";
import {
  detectImageFormatFromMagicBytes,
  doesSubmissionFilenameBelongToSupplier,
  isSafeStoredFilename,
} from "@/lib/storage/product-images";

describe("Sécurité Upload Images Produits (Magic Bytes & Anti Path-Traversal)", () => {
  it("détecte un JPEG, PNG et WEBP valides par leur signature binaire", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectImageFormatFromMagicBytes(jpeg)?.ext).toBe("jpg");

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectImageFormatFromMagicBytes(png)?.ext).toBe("png");

    const webp = Buffer.from("RIFF1234WEBPxxxx", "ascii");
    expect(detectImageFormatFromMagicBytes(webp)?.ext).toBe("webp");
  });

  it("rejette un script HTML/JS renommé en .jpg", () => {
    const fakeSvgOrHtml = Buffer.from("<script>alert(1)</script>", "utf8");
    expect(detectImageFormatFromMagicBytes(fakeSvgOrHtml)).toBeNull();
  });

  it("bloque les tentatives de path traversal et vérifie la propriété fournisseur avant soumission (#2)", () => {
    expect(isSafeStoredFilename("prod_1234567890abcdef.jpg")).toBe(true);
    expect(isSafeStoredFilename("sub_supA123_1234567890abcdef.jpg")).toBe(true);
    expect(isSafeStoredFilename("../.env")).toBe(false);
    expect(isSafeStoredFilename("..\\schema.prisma")).toBe(false);
    expect(isSafeStoredFilename("evil.svg")).toBe(false);

    expect(
      doesSubmissionFilenameBelongToSupplier("sub_supA123_abcdef123456.jpg", "supA123")
    ).toBe(true);
    expect(
      doesSubmissionFilenameBelongToSupplier("sub_supA123_abcdef123456.jpg", "supB999")
    ).toBe(false);
  });
});
