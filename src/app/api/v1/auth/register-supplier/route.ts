import { NextResponse } from "next/server";
import { RoleCode, SupplierActivityType, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { hashPassword, passwordPolicySchema } from "@/lib/auth/password";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";

const registerSupplierSchema = z.object({
  fullName: z.string().trim().min(2, "Nom et prénom du responsable requis.").max(120),
  companyName: z.string().trim().min(2, "Nom commercial ou raison sociale requis.").max(150),
  phone: z.string().trim().min(7, "Numéro de téléphone requis.").max(30),
  email: z.string().trim().email("Adresse e-mail invalide.").toLowerCase(),
  password: passwordPolicySchema,
  pickupNeighborhood: z.string().trim().min(2, "Quartier / zone requis.").max(100),
  pickupAddress: z.string().trim().min(3, "Adresse ou localisation requise.").max(220),
  activityType: z.nativeEnum(SupplierActivityType).default(SupplierActivityType.GROSSISTE),
  description: z
    .string()
    .trim()
    .min(10, "Décrivez brièvement votre activité et vos produits (10 caractères min).")
    .max(1500),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `register:supplier:${ip}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Veuillez réessayer plus tard." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = registerSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Veuillez corriger les informations du formulaire.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte utilise déjà cette adresse e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const created = await prisma.$transaction(async (tx) => {
      const supplierRole = await tx.role.upsert({
        where: { code: RoleCode.SUPPLIER },
        update: {},
        create: {
          code: RoleCode.SUPPLIER,
          name: "Fournisseur Partenaire",
          description: "Fournisseur inscrit proposant ses produits en coulisses à FoodSupply",
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: supplierRole.id,
        },
      });

      const supplier = await tx.supplier.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          tradeName: data.companyName,
          activityType: data.activityType,
          description: data.description,
          pickupAddress: data.pickupAddress,
          pickupNeighborhood: data.pickupNeighborhood,
          pickupCity: "Dakar",
          contactPhone: data.phone,
          verificationStatus: VerificationStatus.PENDING,
          isActive: true,
        },
      });

      // Notifier les administrateurs
      const admins = await tx.user.findMany({
        where: { status: "ACTIVE", roles: { some: { role: { code: RoleCode.ADMIN } } } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "NEW_SUPPLIER",
            title: `Nouveau fournisseur inscrit : ${data.companyName}`,
            message: `${data.fullName} (${data.pickupNeighborhood}) — ${data.activityType}`,
            linkUrl: "/admin/fournisseurs",
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "SUPPLIER_REGISTERED",
          entityType: "Supplier",
          entityId: supplier.id,
          afterJson: {
            companyName: supplier.companyName,
            activityType: supplier.activityType,
            neighborhood: supplier.pickupNeighborhood,
          },
          ipAddress: ip,
        },
      });

      return supplier;
    });

    return NextResponse.json(
      {
        ok: true,
        supplierId: created.id,
        message:
          "Votre compte fournisseur est créé ! Connectez-vous pour accéder à votre espace et soumettre vos premiers produits à FoodSupply.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/register-supplier] Erreur :", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Impossible de finaliser votre inscription fournisseur." },
      { status: 500 }
    );
  }
}
