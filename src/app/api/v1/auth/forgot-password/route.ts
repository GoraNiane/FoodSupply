import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { generateSecureToken } from "@/lib/auth/password";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit/limiter";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

const forgotSchema = z.object({
  email: z.string().trim().email("Adresse email invalide.").toLowerCase(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `forgot:ip:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes de réinitialisation. Veuillez patienter 15 minutes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Veuillez saisir une adresse email valide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user && user.status === "ACTIVE") {
      const { rawToken, tokenHash } = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const resetUrl = `${baseUrl}/reinitialiser-mot-de-passe?token=${rawToken}`;

      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
      });

      if (process.env.NODE_ENV === "development" && emailResult.skipped) {
        console.info(`[DEV ONLY] Lien de réinitialisation pour ${user.email}: ${resetUrl}`);
      }
    }

    // Réponse générique identique (protection contre l'énumération des comptes)
    return NextResponse.json(
      {
        ok: true,
        message:
          "Si un compte actif correspond à cette adresse email, un lien de réinitialisation valable 1 heure vient d'être préparé.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de traiter votre demande pour le moment." },
      { status: 500 }
    );
  }
}
