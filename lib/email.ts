/**
 * Email service — Phase 1.
 * In development, emails are logged to console.
 * Full SMTP implementation will be wired in a later phase.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Email] Would send email:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  // TODO: implement SMTP sending via Nodemailer in a later phase
  console.warn("[Email] SMTP not configured — email not sent.");
}

export function passwordResetEmail(
  resetUrl: string,
  firstName?: string,
): EmailPayload {
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  return {
    to: "",
    subject: "Réinitialisation de votre mot de passe — ZoutaCMS",
    html: `
      <p>${greeting}</p>
      <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      <p>— L'équipe ZoutaCMS</p>
    `,
    text: `${greeting}\n\nRéinitialisation du mot de passe :\n${resetUrl}\n\nCe lien expire dans 1 heure.`,
  };
}

export function welcomeEmail(firstName?: string): EmailPayload {
  const name = firstName ?? "nouveau client";
  return {
    to: "",
    subject: "Bienvenue sur ZoutaCMS",
    html: `
      <p>Bonjour ${name},</p>
      <p>Votre compte ZoutaCMS a été créé avec succès.</p>
      <p>Connectez-vous dès maintenant pour accéder à votre espace.</p>
      <p>— L'équipe ZoutaCMS</p>
    `,
    text: `Bonjour ${name},\n\nVotre compte ZoutaCMS a été créé avec succès.\n\n— L'équipe ZoutaCMS`,
  };
}
