/**
 * Client d'envoi d'e-mails transactionnels via Resend REST API (zéro dépendance lourde).
 * En local sans RESEND_API_KEY, journalise proprement sans bloquer l'application.
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "FoodSupply Dakar <contact@foodsupply.sn>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[EMAIL DEV SKIPPED] To: ${params.to} | Subject: ${params.subject}`);
    }
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      return { sent: false, error: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Erreur réseau email" };
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  fullName: string;
  resetUrl: string;
}) {
  const safeName = params.fullName.replace(/[<>]/g, "");
  return sendTransactionalEmail({
    to: params.to,
    subject: "Réinitialisation de votre mot de passe — FoodSupply Dakar",
    text: `Bonjour ${safeName},\n\nCliquez sur ce lien valable 1 heure pour choisir un nouveau mot de passe FoodSupply :\n${params.resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B0F19;">
        <h2 style="color:#0D1B44;margin-bottom:8px;">FoodSupply Dakar</h2>
        <p>Bonjour <strong>${safeName}</strong>,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable <strong>1 heure</strong> :</p>
        <p style="margin:24px 0;">
          <a href="${params.resetUrl}" style="background:#2563EB;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="font-size:12px;color:#64748B;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      </div>
    `,
  });
}
