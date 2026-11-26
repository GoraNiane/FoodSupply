import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

const BCRYPT_ROUNDS = 12;

export const passwordPolicySchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Génère un jeton aléatoire cryptographiquement sûr (hexadécimal) et son hash SHA-256.
 * Utilisé pour la réinitialisation de mot de passe et le suivi sécurisé des commandes invitées.
 */
export function generateSecureToken(bytes = 32): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(bytes).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Compare un jeton brut à son empreinte SHA-256 en temps constant (anti timing-attack).
 */
export function verifyTokenHash(rawToken: string, expectedHash: string): boolean {
  const computed = Buffer.from(hashToken(rawToken), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}
