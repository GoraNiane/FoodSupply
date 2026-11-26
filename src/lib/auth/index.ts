import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import {
  isExclusiveAccountRoleValid,
  isRoleAllowedForPortal,
  type LoginPortal,
} from "@/lib/permissions/rbac";
import { authConfig } from "./config";

const credentialsSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
  portal: z.enum(["CLIENT", "ADMIN", "SUPPLIER", "DRIVER"]).default("CLIENT"),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Identifiants professionnels",
    credentials: {
      email: { label: "Email professionnel", type: "email" },
      password: { label: "Mot de passe", type: "password" },
      portal: { label: "Portail", type: "text" },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) return null;

      const { email, password, portal } = parsed.data;

      // Protection anti brute-force par adresse email (8 tentatives / 15 min)
      const rateCheck = checkRateLimit({
        key: `login:email:${portal}:${email}`,
        limit: 8,
        windowMs: 15 * 60 * 1000,
      });
      if (!rateCheck.allowed) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: { include: { role: true } },
          restaurant: { select: { id: true } },
          supplier: { select: { id: true } },
          driver: { select: { id: true } },
        },
      });

      if (!user || user.status !== "ACTIVE") {
        return null;
      }

      const roles = user.roles.map((ur) => ur.role.code);

      // Séparation stricte : un compte Fournisseur/Admin ne peut jamais se connecter comme Client (et inversement)
      if (!isExclusiveAccountRoleValid(roles)) {
        return null;
      }
      if (!isRoleAllowedForPortal(roles, portal as LoginPortal)) {
        return null;
      }

      // Vérification supplémentaire d'intégrité de profil en base
      if (portal === "CLIENT" && (user.supplier || user.driver)) {
        return null;
      }
      if (portal === "ADMIN" && user.restaurant) {
        return null;
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        return null;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        roles,
        sessionVersion: user.sessionVersion,
        restaurantId: roles.includes("RESTAURANT") ? (user.restaurant?.id ?? null) : null,
        supplierId: roles.includes("SUPPLIER") ? (user.supplier?.id ?? null) : null,
        driverId: roles.includes("DRIVER") ? (user.driver?.id ?? null) : null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
});
