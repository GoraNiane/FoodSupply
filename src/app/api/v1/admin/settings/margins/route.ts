import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { defaultMarginSchema } from "@/modules/catalog/schemas";
import { getPlatformDefaultMargin } from "@/modules/catalog/admin-service";

export async function GET() {
  try {
    await requireApiPermission("margins:manage");
    const defaultMargin = await getPlatformDefaultMargin();
    return NextResponse.json({ defaultMargin });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Impossible de charger les marges." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireApiPermission("margins:manage");
    const body = await request.json();
    const parsed = defaultMarginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres de marge invalides.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const before = await getPlatformDefaultMargin();

    await prisma.$transaction([
      prisma.platformSetting.upsert({
        where: { key: "default_margin" },
        update: {
          valueJson: parsed.data,
          updatedById: actor.id,
        },
        create: {
          key: "default_margin",
          valueJson: parsed.data,
          description: "Marge commerciale par défaut FoodSupply",
          updatedById: actor.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "DEFAULT_MARGIN_UPDATED",
          entityType: "PlatformSetting",
          entityId: "default_margin",
          beforeJson: before,
          afterJson: parsed.data,
        },
      }),
    ]);

    revalidateTag("settings");
    revalidateTag("catalog");
    return NextResponse.json({ ok: true, defaultMargin: parsed.data });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la marge." }, { status: 500 });
  }
}
