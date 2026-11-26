import { NextResponse } from "next/server";
import { SupplierActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";

const supplierProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  activityType: z.nativeEnum(SupplierActivityType),
  contactPhone: z.string().trim().min(7).max(30),
  pickupNeighborhood: z.string().trim().min(2).max(100),
  pickupAddress: z.string().trim().min(3).max(220),
  pickupLandmark: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(10).max(1500),
  ninea: z.string().trim().max(60).optional().nullable(),
  rcNumber: z.string().trim().max(60).optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission("offers:manage:own");
    if (!user.supplierId) {
      return NextResponse.json({ error: "Profil fournisseur introuvable." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = supplierProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Veuillez vérifier vos informations." }, { status: 400 });
    }

    await prisma.supplier.update({
      where: { id: user.supplierId },
      data: {
        companyName: parsed.data.companyName,
        tradeName: parsed.data.companyName,
        activityType: parsed.data.activityType,
        contactPhone: parsed.data.contactPhone,
        pickupNeighborhood: parsed.data.pickupNeighborhood,
        pickupAddress: parsed.data.pickupAddress,
        pickupLandmark: parsed.data.pickupLandmark || null,
        description: parsed.data.description,
        ninea: parsed.data.ninea || null,
        rcNumber: parsed.data.rcNumber || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }
}
