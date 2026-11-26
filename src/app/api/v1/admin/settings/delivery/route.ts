import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { deliveryFeeRulesSchema } from "@/modules/catalog/schemas";
import { getPlatformDeliveryRules } from "@/modules/catalog/admin-service";

export async function GET() {
  try {
    await requireApiPermission("margins:manage");
    const rules = await getPlatformDeliveryRules();
    return NextResponse.json({ rules });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger les frais de livraison." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireApiPermission("margins:manage");
    const body = await request.json();
    const parsed = deliveryFeeRulesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres de livraison invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const before = await getPlatformDeliveryRules();

    await prisma.$transaction([
      prisma.platformSetting.upsert({
        where: { key: "delivery_fee_rules" },
        update: {
          valueJson: parsed.data,
          updatedById: actor.id,
        },
        create: {
          key: "delivery_fee_rules",
          valueJson: parsed.data,
          description: "Grille des frais de livraison Dakar",
          updatedById: actor.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "DELIVERY_FEE_RULES_UPDATED",
          entityType: "PlatformSetting",
          entityId: "delivery_fee_rules",
          beforeJson: before as unknown as object,
          afterJson: parsed.data,
        },
      }),
    ]);

    revalidateTag("settings");
    return NextResponse.json({ ok: true, rules: parsed.data });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de l'enregistrement des frais." }, { status: 500 });
  }
}
