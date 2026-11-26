import { cache } from "react";
import { redirect } from "next/navigation";
import type { RoleCode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import {
  hasAnyRole,
  hasPermission,
  type PermissionCode,
} from "@/lib/permissions/rbac";

export interface VerifiedSessionUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
  restaurantId: string | null;
  supplierId: string | null;
  driverId: string | null;
}

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Récupère et re-valide la session contre la base TiDB Cloud (status ACTIVE + sessionVersion).
 * Enveloppé avec React.cache() : dédupliqué automatiquement sur toute la durée d'une requête HTTP
 * (layout + page ne déclenchent plus qu'une seule requête DB au lieu de deux).
 */
export const getVerifiedSessionUser = cache(async (): Promise<VerifiedSessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        sessionVersion: true,
        roles: { select: { role: { select: { code: true } } } },
        restaurant: { select: { id: true } },
        supplier: { select: { id: true } },
        driver: { select: { id: true } },
      },
    });

    if (!dbUser || dbUser.status !== "ACTIVE") {
      return null;
    }

    if (dbUser.sessionVersion !== session.user.sessionVersion) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      roles: dbUser.roles.map((r) => r.role.code),
      restaurantId: dbUser.restaurant?.id ?? null,
      supplierId: dbUser.supplier?.id ?? null,
      driverId: dbUser.driver?.id ?? null,
    };
  } catch {
    return null;
  }
});

/**
 * Garde pour Server Components (redirige vers le portail de connexion dédié ou /acces-refuse).
 */
export async function requirePageRole(
  allowedRoles: RoleCode[],
  loginPath = "/connexion"
): Promise<VerifiedSessionUser> {
  const user = await getVerifiedSessionUser();
  if (!user) {
    redirect(loginPath);
  }
  if (user.roles.length !== 1 || !hasAnyRole(user.roles, allowedRoles)) {
    redirect("/acces-refuse");
  }
  return user;
}

/**
 * Garde pour Route Handlers et Server Actions (lève AuthorizationError 401/403).
 */
export async function requireApiPermission(
  permission: PermissionCode
): Promise<VerifiedSessionUser> {
  const user = await getVerifiedSessionUser();
  if (!user) {
    throw new AuthorizationError("Authentification requise.", 401);
  }
  if (!hasPermission(user.roles, permission)) {
    throw new AuthorizationError("Vous n'avez pas l'autorisation pour cette action.", 403);
  }
  return user;
}
