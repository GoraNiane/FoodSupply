import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Veuillez saisir votre nom complet.").max(120),
  companyName: z.string().trim().min(2, "Veuillez indiquer votre établissement.").max(150),
  email: z.string().trim().email("Adresse email professionnelle invalide."),
  phone: z.string().trim().min(7, "Numéro de téléphone invalide.").max(30),
  profileType: z.enum(["RESTAURANT", "SUPPLIER", "DRIVER", "AUTRE"]),
  subject: z.string().trim().min(4, "Veuillez préciser l'objet.").max(160),
  message: z.string().trim().min(15, "Votre message doit contenir au moins 15 caractères.").max(2000),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `contact:ip:${ip}`,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Trop de messages envoyés. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Données du formulaire invalides.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const reference = `CNT-${Date.now().toString(36).toUpperCase()}`;

    await prisma.contactMessage.create({
      data: {
        reference,
        fullName: parsed.data.fullName,
        companyName: parsed.data.companyName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        profileType: parsed.data.profileType,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    // Notifie l'Admin dans sa boîte de notifications
    try {
      const admins = await prisma.user.findMany({
        where: { status: "ACTIVE", roles: { some: { role: { code: "ADMIN" } } } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "CONTACT_MESSAGE",
            title: `Nouveau message contact — ${parsed.data.companyName}`,
            message: `${parsed.data.fullName} (${parsed.data.phone}) : ${parsed.data.subject}`,
            linkUrl: "/admin/messages",
          })),
        });
      }
    } catch {
      // Non bloquant
    }

    return NextResponse.json(
      {
        ok: true,
        reference,
        message:
          "Votre demande a bien été enregistrée et transmise à l'équipe FoodSupply Dakar. Nous vous répondrons sous 24 heures ouvrées.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de traiter votre demande pour le moment." },
      { status: 500 }
    );
  }
}
