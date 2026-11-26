import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { adminSettingsUpdateSchema } from "@/modules/payments/schemas";
import { getCompanyProfile, getPaymentConfig } from "@/modules/payments/settings";

export async function GET() {
  try {
    await requireApiPermission("users:manage");
    const [paymentConfig, companyProfile] = await Promise.all([
      getPaymentConfig(),
      getCompanyProfile(),
    ]);
    return NextResponse.json({ paymentConfig, companyProfile });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger les paramètres." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminUser = await requireApiPermission("users:manage");
    const body = await request.json();
    const parsed = adminSettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Paramètres invalides." },
        { status: 400 }
      );
    }

    const { paymentConfig, companyProfile } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (paymentConfig) {
        await tx.platformSetting.upsert({
          where: { key: "payment_config" },
          update: {
            valueJson: paymentConfig as unknown as Prisma.InputJsonValue,
            updatedById: adminUser.id,
          },
          create: {
            key: "payment_config",
            valueJson: paymentConfig as unknown as Prisma.InputJsonValue,
            description: "Lien marchand Wave Sénégal et options de règlement",
            updatedById: adminUser.id,
          },
        });
      }

      if (companyProfile) {
        const value = { ...companyProfile, currency: "XOF" };
        await tx.platformSetting.upsert({
          where: { key: "company_profile" },
          update: {
            valueJson: value as unknown as Prisma.InputJsonValue,
            updatedById: adminUser.id,
          },
          create: {
            key: "company_profile",
            valueJson: value as unknown as Prisma.InputJsonValue,
            description: "Coordonnées légales affichées sur les factures PDF FoodSupply",
            updatedById: adminUser.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: adminUser.id,
          action: "PLATFORM_SETTINGS_UPDATED",
          entityType: "PlatformSetting",
          entityId: "payment_and_company",
          afterJson: parsed.data as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidateTag("settings");

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: "Impossible d'enregistrer les paramètres." },
      { status: 500 }
    );
  }
}
