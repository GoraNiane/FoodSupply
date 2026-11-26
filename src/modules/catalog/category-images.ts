export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  oeufs: "/images/categories/oeufs.jpg",
  "poulet-viande": "/images/categories/poulet-viande.jpg",
  poissons: "/images/categories/poissons.jpg",
  farine: "/images/categories/farine.jpg",
  huile: "/images/categories/huile.jpg",
  "produits-laitiers": "/images/categories/produits-laitiers.jpg",
  "sauces-condiments": "/images/categories/sauces-condiments.jpg",
  surgeles: "/images/categories/surgeles.jpg",
  "fruits-legumes": "/images/categories/fruits-legumes.jpg",
  emballages: "/images/categories/emballages.jpg",
};

export function resolveCategoryImage(slug: string, customImageUrl?: string | null): string | null {
  if (customImageUrl && customImageUrl.trim().length > 0) {
    return customImageUrl;
  }
  return CATEGORY_DEFAULT_IMAGES[slug] ?? null;
}
