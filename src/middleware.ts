import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { RoleCode } from "@prisma/client";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

/**
 * Cloisonnement strict : chaque espace est réservé exclusivement à son propre type de compte.
 * Un compte Admin/Vendeur ne partage jamais l'espace Client (et inversement).
 */
const ROUTE_ROLE_RULES: Array<{
  prefix: string;
  allowedRole: RoleCode;
  loginPath: string;
}> = [
  { prefix: "/admin", allowedRole: "ADMIN", loginPath: "/connexion-admin" },
  { prefix: "/restaurant", allowedRole: "RESTAURANT", loginPath: "/connexion" },
  { prefix: "/fournisseur", allowedRole: "SUPPLIER", loginPath: "/connexion-fournisseur" },
  { prefix: "/livreur", allowedRole: "DRIVER", loginPath: "/connexion-admin" },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const matchedRule = ROUTE_ROLE_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  );

  if (!matchedRule) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL(matchedRule.loginPath, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roles = (session.user.roles ?? []) as RoleCode[];
  const isAuthorized = roles.length === 1 && roles[0] === matchedRule.allowedRole;

  if (!isAuthorized) {
    return NextResponse.redirect(new URL("/acces-refuse", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/livreur/:path*", "/fournisseur/:path*", "/restaurant/:path*"],
};
