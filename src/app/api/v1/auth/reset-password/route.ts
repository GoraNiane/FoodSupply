import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { hashPassword, hashToken, passwordPolicySchema } from "@/lib/auth/password";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";

const resetSchema = z.object({
  token: z.string().trim().min(32, "Lien de réinitialisation invalide."),
  password: passwordPolicySchema,
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `reset:ip:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer plus tard." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Données invalides.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || record.user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Ce lien de réinitialisation est invalide ou a expiré." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: newPasswordHash,
          sessionVersion: { increment: 1 }, // Invalide toutes les sessions existantes
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: record.userId,
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: record.userId,
          ipAddress: ip,
        },
      }),
    ]);

    return NextResponse.json(
      { ok: true, message: "Votre mot de passe a été mis à jour. Vous pouvez vous connecter." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe." },
      { status: 500 }
    );
  }
}
