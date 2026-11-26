import {
  MarginType,
  PayoutMethod,
  PrismaClient,
  RoleCode,
  UserStatus,
  VerificationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ code: string; module: string; description: string }> = [
  { code: "users:manage", module: "users", description: "Gérer tous les utilisateurs" },
  { code: "suppliers:verify", module: "suppliers", description: "Valider ou rejeter les fournisseurs" },
  { code: "drivers:verify", module: "drivers", description: "Valider ou rejeter les livreurs" },
  { code: "catalog:read", module: "catalog", description: "Consulter le catalogue produits" },
  { code: "catalog:manage", module: "catalog", description: "Gérer les catégories et produits" },
  { code: "offers:manage:own", module: "offers", description: "Gérer ses propres offres" },
  { code: "offers:manage:all", module: "offers", description: "Gérer toutes les offres et marges" },
  { code: "margins:manage", module: "finance", description: "Configurer les marges commerciales" },
  { code: "orders:create", module: "orders", description: "Soumettre des commandes" },
  { code: "orders:read:own", module: "orders", description: "Consulter ses propres commandes" },
  { code: "orders:confirm:supplier", module: "orders", description: "Confirmer ses sous-commandes" },
  { code: "orders:manage:all", module: "orders", description: "Administrer toutes les commandes" },
  { code: "payments:create", module: "payments", description: "Initier un paiement" },
  { code: "payments:manage:all", module: "payments", description: "Gérer paiements et remboursements" },
  { code: "deliveries:execute", module: "deliveries", description: "Exécuter des collectes et livraisons" },
  { code: "deliveries:manage:all", module: "deliveries", description: "Organiser les livraisons" },
  { code: "settlements:manage", module: "finance", description: "Suivre les règlements" },
  { code: "audit:read", module: "audit", description: "Consulter le journal d'audit" },
];

const ROLE_PERMISSION_MAP: Record<RoleCode, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.code),
  RESTAURANT: ["catalog:read", "orders:create", "orders:read:own", "payments:create"],
  SUPPLIER: ["catalog:read", "offers:manage:own", "orders:confirm:supplier"],
  DRIVER: ["deliveries:execute"],
};

async function main() {
  console.log("Initialisation FoodSupply (Vendeur Unique — TiDB Cloud)...");

  // 1. Rôles & Permissions
  const rolesByCode = new Map<RoleCode, string>();
  for (const code of Object.values(RoleCode)) {
    const labels: Record<RoleCode, { name: string; description: string }> = {
      ADMIN: { name: "Administrateur / Vendeur Unique", description: "Gestion complète FoodSupply" },
      RESTAURANT: { name: "Restaurant / Client Pro", description: "Client professionnel (facultatif)" },
      SUPPLIER: { name: "Fournisseur", description: "Rôle réservé à l'évolution multi-fournisseurs" },
      DRIVER: { name: "Livreur", description: "Rôle réservé à l'évolution livreurs in-app" },
    };
    const role = await prisma.role.upsert({
      where: { code },
      update: labels[code],
      create: { code, ...labels[code] },
    });
    rolesByCode.set(code, role.id);
  }

  const permissionsByCode = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
    permissionsByCode.set(p.code, p.id);
  }

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP) as Array<
    [RoleCode, string[]]
  >) {
    const roleId = rolesByCode.get(roleCode)!;
    for (const permCode of permCodes) {
      const permissionId = permissionsByCode.get(permCode)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // 2. Paramètres globaux FoodSupply Dakar
  const defaultSettings = [
    {
      key: "default_margin",
      valueJson: { marginType: "PERCENTAGE", marginValue: 1500 },
      description: "Marge commerciale par défaut (15 %)",
    },
    {
      key: "delivery_fee_rules",
      valueJson: {
        baseFeeXof: 2000,
        extraSupplierPickupFeeXof: 0,
        coldChainSurchargeXof: 1000,
        fragileSurchargeXof: 500,
        freeDeliveryThresholdXof: 250000,
      },
      description: "Grille des frais de livraison Dakar",
    },
    {
      key: "payment_config",
      valueJson: {
        waveMerchantBaseUrl: "https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/",
        allowCashOnDelivery: true,
        whatsappSupportPhone: "+221338204500",
      },
      description: "Lien marchand Wave Sénégal (montant pré-rempli) et options de règlement",
    },
    {
      key: "company_profile",
      valueJson: {
        legalName: "FoodSupply Sénégal SARL",
        address: "Sacré-Cœur 3, VDN, Dakar, Sénégal",
        ninea: "À renseigner dans Paramètres",
        rc: "À renseigner dans Paramètres",
        phone: "+221 33 820 45 00",
        email: "contact@foodsupply.sn",
        currency: "XOF",
      },
      description: "Coordonnées affichées sur vos factures PDF",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: { description: setting.description },
      create: setting,
    });
  }

  // 3. Compte Administrateur (Vendeur Unique)
  const adminPasswordHash = await bcrypt.hash("FoodSupply2026!", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@foodsupply.sn" },
    update: { status: UserStatus.ACTIVE },
    create: {
      email: "admin@foodsupply.sn",
      passwordHash: adminPasswordHash,
      fullName: "Administrateur FoodSupply",
      phone: "+221 77 100 00 01",
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const adminRoleId = rolesByCode.get(RoleCode.ADMIN)!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRoleId } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRoleId },
  });

  // 4. Profil vendeur interne principal (rattaché à votre compte Admin)
  await prisma.supplier.upsert({
    where: { userId: adminUser.id },
    update: { verificationStatus: VerificationStatus.APPROVED, isActive: true },
    create: {
      userId: adminUser.id,
      companyName: "FoodSupply Dakar",
      tradeName: "FoodSupply Direct",
      description: "Boutique officielle FoodSupply Dakar.",
      pickupAddress: "Sacré-Cœur 3, VDN",
      pickupNeighborhood: "Sacré-Cœur",
      pickupCity: "Dakar",
      contactPhone: "+221 33 820 45 00",
      verificationStatus: VerificationStatus.APPROVED,
      verifiedAt: new Date(),
      verifiedById: adminUser.id,
      payoutMethod: PayoutMethod.WAVE,
      isActive: true,
    },
  });

  // 5. Catégories de base (modifiables/supprimables — AUCUN faux produit pré-rempli)
  const baseCategories = [
    { name: "Œufs", slug: "oeufs", imageUrl: "/images/categories/oeufs.jpg", displayOrder: 1, marginType: MarginType.FIXED_XOF, marginValue: 700 },
    { name: "Poulet & Viande", slug: "poulet-viande", imageUrl: "/images/categories/poulet-viande.jpg", displayOrder: 2 },
    { name: "Poissons", slug: "poissons", imageUrl: "/images/categories/poissons.jpg", displayOrder: 3 },
    { name: "Farine", slug: "farine", imageUrl: "/images/categories/farine.jpg", displayOrder: 4 },
    { name: "Huile", slug: "huile", imageUrl: "/images/categories/huile.jpg", displayOrder: 5 },
    { name: "Fromages & Laitiers", slug: "produits-laitiers", imageUrl: "/images/categories/produits-laitiers.jpg", displayOrder: 6 },
    { name: "Sauces & Condiments", slug: "sauces-condiments", imageUrl: "/images/categories/sauces-condiments.jpg", displayOrder: 7 },
    { name: "Surgelés", slug: "surgeles", imageUrl: "/images/categories/surgeles.jpg", displayOrder: 8 },
    { name: "Fruits & Légumes", slug: "fruits-legumes", imageUrl: "/images/categories/fruits-legumes.jpg", displayOrder: 9 },
    { name: "Emballages", slug: "emballages", imageUrl: "/images/categories/emballages.jpg", displayOrder: 10 },
  ];

  for (const cat of baseCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { imageUrl: cat.imageUrl },
      create: cat,
    });
  }

  console.log("Initialisation TiDB Cloud terminée !");
  console.log("Aucun faux produit injecté : ajoutez vos propres articles, prix et photos dans /admin/produits.");
  console.log("Compte Admin : admin@foodsupply.sn / FoodSupply2026!");
}

main()
  .catch((error) => {
    console.error("Erreur lors du seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
