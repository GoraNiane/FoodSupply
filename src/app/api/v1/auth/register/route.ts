import { NextResponse } from "next/server";
import { BusinessType, RoleCode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { hashPassword, passwordPolicySchema } from "@/lib/auth/password";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";

/**
 * Inscription facultative réservée exclusivement aux clients professionnels (RESTAURANT).
 * Les comptes ADMIN (vendeur unique) et DRIVER sont provisionnés uniquement depuis l'administration.
 */
const registerRestaurantSchema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis.").max(120),
  email: z.string().trim().email("Adresse email professionnelle invalide.").toLowerCase(),
  phone: z.string().trim().min(7, "Numéro de téléphone requis.").max(30),
  password: passwordPolicySchema,
  businessName: z.string().trim().min(2, "Nom de l'établissement requis.").max(150),
  businessType: z.nativeEnum(BusinessType).default(BusinessType.RESTAURANT),
  neighborhood: z.string().trim().min(2, "Quartier à Dakar requis.").max(100),
  street: z.string().trim().min(3, "Adresse de livraison requise.").max(200),
  landmark: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `register:ip:${ip}`,
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
    const parsed = registerRestaurantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Veuillez corriger les informations saisies.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const created = await prisma.$transaction(async (tx) => {
      const restaurantRole = await tx.role.upsert({
        where: { code: RoleCode.RESTAURANT },
        update: {},
        create: {
          code: RoleCode.RESTAURANT,
          name: "Restaurant / Client Pro",
          description: "Établissement de restauration acheteur",
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
          roleId: restaurantRole.id,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          userId: user.id,
          businessName: data.businessName,
          businessType: data.businessType,
          contactPhone: data.phone,
          contactEmail: data.email,
        },
      });

      await tx.restaurantAddress.create({
        data: {
          restaurantId: restaurant.id,
          label: `Établissement principal — ${data.neighborhood}`,
          street: data.street,
          neighborhood: data.neighborhood,
          city: "Dakar",
          landmark: data.landmark || null,
          contactName: data.fullName,
          contactPhone: data.phone,
          isDefault: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "RESTAURANT_REGISTERED",
          entityType: "Restaurant",
          entityId: restaurant.id,
          afterJson: { businessName: restaurant.businessName, businessType: restaurant.businessType },
          ipAddress: ip,
        },
      });

      return { userId: user.id, restaurantId: restaurant.id };
    });

    return NextResponse.json(
      {
        ok: true,
        userId: created.userId,
        message: "Votre compte client FoodSupply a été créé avec succès. Vous pouvez vous connecter.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/register] Erreur :", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Impossible de finaliser l'inscription pour le moment." },
      { status: 500 }
    );
  }
}
