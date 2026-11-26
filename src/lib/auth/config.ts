import type { NextAuthConfig } from "next-auth";
import type { RoleCode } from "@prisma/client";

/**
 * Configuration Edge-compatible d'Auth.js v5 (sans imports Prisma ni Node crypto).
 * Utilisée par src/middleware.ts et étendue par src/lib/auth/index.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 jours
    updateAge: 24 * 60 * 60, // Renouvellement toutes les 24h
  },
  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.roles = user.roles;
        token.sessionVersion = user.sessionVersion;
        token.restaurantId = user.restaurantId ?? null;
        token.supplierId = user.supplierId ?? null;
        token.driverId = user.driverId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.roles = (token.roles ?? []) as RoleCode[];
        session.user.sessionVersion = token.sessionVersion ?? 1;
        session.user.restaurantId = token.restaurantId ?? null;
        session.user.supplierId = token.supplierId ?? null;
        session.user.driverId = token.driverId ?? null;
      }
      return session;
    },
  },
};
