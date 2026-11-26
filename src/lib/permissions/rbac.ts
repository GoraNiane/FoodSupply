import type { RoleCode } from "@prisma/client";
import { verifyTokenHash } from "@/lib/auth/password";

export type PermissionCode =
  | "users:manage"
  | "suppliers:verify"
  | "drivers:verify"
  | "catalog:read"
  | "catalog:manage"
  | "offers:manage:own"
  | "offers:manage:all"
  | "margins:manage"
  | "orders:create"
  | "orders:read:own"
  | "orders:confirm:supplier"
  | "orders:manage:all"
  | "payments:create"
  | "payments:manage:all"
  | "deliveries:execute"
  | "deliveries:manage:all"
  | "settlements:manage"
  | "audit:read";

const ROLE_PERMISSIONS: Record<RoleCode, ReadonlySet<PermissionCode>> = {
  ADMIN: new Set<PermissionCode>([
    "users:manage",
    "suppliers:verify",
    "drivers:verify",
    "catalog:read",
    "catalog:manage",
    "offers:manage:own",
    "offers:manage:all",
    "margins:manage",
    "orders:create",
    "orders:read:own",
    "orders:confirm:supplier",
    "orders:manage:all",
    "payments:create",
    "payments:manage:all",
    "deliveries:execute",
    "deliveries:manage:all",
    "settlements:manage",
    "audit:read",
  ]),
  RESTAURANT: new Set<PermissionCode>([
    "catalog:read",
    "orders:create",
    "orders:read:own",
    "payments:create",
  ]),
  SUPPLIER: new Set<PermissionCode>([
    "catalog:read",
    "offers:manage:own",
    "orders:confirm:supplier",
  ]),
  DRIVER: new Set<PermissionCode>(["deliveries:execute"]),
};

export function hasAnyRole(userRoles: readonly RoleCode[], allowed: readonly RoleCode[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

/**
 * Règle métier stricte : un compte Fournisseur/Vendeur (ADMIN ou SUPPLIER)
 * ne peut JAMAIS être en même temps un compte Client (RESTAURANT) ou Livreur (DRIVER).
 * Chaque compte correspond à exactement 1 type d'acteur exclusif.
 */
export function isExclusiveAccountRoleValid(userRoles: readonly RoleCode[]): boolean {
  const uniqueRoles = Array.from(new Set(userRoles));
  return uniqueRoles.length === 1;
}

export type LoginPortal = "CLIENT" | "ADMIN" | "SUPPLIER" | "DRIVER";

export function isRoleAllowedForPortal(
  userRoles: readonly RoleCode[],
  portal: LoginPortal
): boolean {
  if (!isExclusiveAccountRoleValid(userRoles)) return false;
  switch (portal) {
    case "ADMIN":
      return userRoles.includes("ADMIN");
    case "CLIENT":
      return userRoles.includes("RESTAURANT");
    case "SUPPLIER":
      return userRoles.includes("SUPPLIER");
    case "DRIVER":
      return userRoles.includes("DRIVER");
    default:
      return false;
  }
}

export function hasPermission(
  userRoles: readonly RoleCode[],
  permission: PermissionCode
): boolean {
  return userRoles.some((role) => ROLE_PERMISSIONS[role]?.has(permission) ?? false);
}

export function getDefaultDashboardPath(userRoles: readonly RoleCode[]): string {
  if (userRoles.includes("ADMIN")) return "/admin";
  if (userRoles.includes("DRIVER")) return "/livreur";
  if (userRoles.includes("SUPPLIER")) return "/fournisseur";
  if (userRoles.includes("RESTAURANT")) return "/restaurant";
  return "/catalogue";
}

export interface OrderAccessTarget {
  restaurantId: string | null;
  isGuestOrder: boolean;
  guestTrackingTokenHash: string | null;
  assignedDriverId?: string | null;
  supplierIds?: string[];
}

export interface AccessActor {
  roles: readonly RoleCode[];
  restaurantId?: string | null;
  driverId?: string | null;
  supplierId?: string | null;
}

/**
 * Contrôle strict d'accès à une commande (prévention IDOR multi-tenant & commandes invitées).
 */
export function canAccessOrder(params: {
  order: OrderAccessTarget;
  actor?: AccessActor | null;
  guestToken?: string | null;
}): boolean {
  const { order, actor, guestToken } = params;

  // 1. Administrateur (vendeur unique) : accès intégral
  if (actor && actor.roles.includes("ADMIN")) {
    return true;
  }

  // 2. Restaurant authentifié : uniquement ses propres commandes
  if (
    actor &&
    actor.roles.includes("RESTAURANT") &&
    actor.restaurantId &&
    order.restaurantId &&
    actor.restaurantId === order.restaurantId
  ) {
    return true;
  }

  // 3. Livreur assigné à la livraison de cette commande
  if (
    actor &&
    actor.roles.includes("DRIVER") &&
    actor.driverId &&
    order.assignedDriverId &&
    actor.driverId === order.assignedDriverId
  ) {
    return true;
  }

  // 4. Fournisseur concerné par une sous-commande (si multi-fournisseurs activé)
  if (
    actor &&
    actor.roles.includes("SUPPLIER") &&
    actor.supplierId &&
    order.supplierIds?.includes(actor.supplierId)
  ) {
    return true;
  }

  // 5. Client invité (sans compte) : uniquement avec le jeton de suivi cryptographique valide
  if (
    order.isGuestOrder &&
    order.guestTrackingTokenHash &&
    guestToken &&
    guestToken.trim().length >= 16
  ) {
    return verifyTokenHash(guestToken.trim(), order.guestTrackingTokenHash);
  }

  return false;
}
