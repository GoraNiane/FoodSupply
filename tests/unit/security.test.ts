import { beforeEach, describe, expect, it } from "vitest";
import {
  generateSecureToken,
  hashPassword,
  passwordPolicySchema,
  verifyPassword,
  verifyTokenHash,
} from "@/lib/auth/password";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit/limiter";
import {
  canAccessOrder,
  getDefaultDashboardPath,
  hasAnyRole,
  hasPermission,
  isExclusiveAccountRoleValid,
  isRoleAllowedForPortal,
} from "@/lib/permissions/rbac";

describe("Sécurité Authentification & Hachage", () => {
  it("hache et vérifie correctement un mot de passe avec bcrypt", async () => {
    const hash = await hashPassword("FoodSupply2026!");
    expect(hash).not.toBe("FoodSupply2026!");
    expect(await verifyPassword("FoodSupply2026!", hash)).toBe(true);
    expect(await verifyPassword("MauvaisMotDePasse1", hash)).toBe(false);
  });

  it("rejette les mots de passe faibles selon la politique de sécurité", () => {
    expect(passwordPolicySchema.safeParse("abc123").success).toBe(false);
    expect(passwordPolicySchema.safeParse("toutenminuscule1").success).toBe(false);
    expect(passwordPolicySchema.safeParse("SansChiffre").success).toBe(false);
    expect(passwordPolicySchema.safeParse("Valide2026").success).toBe(true);
  });

  it("valide les jetons de réinitialisation et suivi invité en temps constant", () => {
    const { rawToken, tokenHash } = generateSecureToken(32);
    expect(verifyTokenHash(rawToken, tokenHash)).toBe(true);
    expect(verifyTokenHash(`${rawToken}x`, tokenHash)).toBe(false);
    expect(verifyTokenHash("mauvais-jeton", tokenHash)).toBe(false);
  });
});

describe("Limitation de débit (Anti brute-force)", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("autorise jusqu'à la limite puis bloque jusqu'à expiration de la fenêtre", () => {
    const start = 1_000_000;
    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit({ key: "login:test", limit: 3, windowMs: 60_000, now: start });
      expect(res.allowed).toBe(true);
    }

    const blocked = checkRateLimit({ key: "login:test", limit: 3, windowMs: 60_000, now: start + 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const afterWindow = checkRateLimit({
      key: "login:test",
      limit: 3,
      windowMs: 60_000,
      now: start + 61_000,
    });
    expect(afterWindow.allowed).toBe(true);
  });
});

describe("RBAC & Protection anti-IDOR (Commandes inscrites et invitées)", () => {
  it("applique strictement les permissions par rôle", () => {
    expect(hasPermission(["ADMIN"], "margins:manage")).toBe(true);
    expect(hasPermission(["RESTAURANT"], "margins:manage")).toBe(false);
    expect(hasPermission(["RESTAURANT"], "orders:create")).toBe(true);
    expect(hasPermission(["DRIVER"], "deliveries:execute")).toBe(true);
    expect(hasPermission(["DRIVER"], "users:manage")).toBe(false);
    expect(hasAnyRole(["RESTAURANT"], ["ADMIN", "DRIVER"])).toBe(false);
    expect(getDefaultDashboardPath(["ADMIN"])).toBe("/admin");
    expect(getDefaultDashboardPath(["DRIVER"])).toBe("/livreur");
    expect(getDefaultDashboardPath(["RESTAURANT"])).toBe("/restaurant");
  });

  it("interdit qu'un compte fournisseur/vendeur soit en même temps un compte client", () => {
    expect(isExclusiveAccountRoleValid(["RESTAURANT"])).toBe(true);
    expect(isExclusiveAccountRoleValid(["ADMIN"])).toBe(true);
    expect(isExclusiveAccountRoleValid(["SUPPLIER"])).toBe(true);
    expect(isExclusiveAccountRoleValid(["RESTAURANT", "SUPPLIER"])).toBe(false);
    expect(isExclusiveAccountRoleValid(["RESTAURANT", "ADMIN"])).toBe(false);
    expect(isExclusiveAccountRoleValid([])).toBe(false);

    // Séparation stricte des portails de connexion
    expect(isRoleAllowedForPortal(["ADMIN"], "ADMIN")).toBe(true);
    expect(isRoleAllowedForPortal(["ADMIN"], "CLIENT")).toBe(false);
    expect(isRoleAllowedForPortal(["SUPPLIER"], "CLIENT")).toBe(false);
    expect(isRoleAllowedForPortal(["RESTAURANT"], "CLIENT")).toBe(true);
    expect(isRoleAllowedForPortal(["RESTAURANT"], "ADMIN")).toBe(false);
  });

  it("interdit à un restaurant d'accéder à la commande d'un autre restaurant (IDOR)", () => {
    const orderOfRestoA = {
      restaurantId: "resto-A",
      isGuestOrder: false,
      guestTrackingTokenHash: null,
      assignedDriverId: "driver-1",
    };

    expect(
      canAccessOrder({
        order: orderOfRestoA,
        actor: { roles: ["RESTAURANT"], restaurantId: "resto-A" },
      })
    ).toBe(true);

    expect(
      canAccessOrder({
        order: orderOfRestoA,
        actor: { roles: ["RESTAURANT"], restaurantId: "resto-B" },
      })
    ).toBe(false);

    expect(
      canAccessOrder({
        order: orderOfRestoA,
        actor: { roles: ["ADMIN"] },
      })
    ).toBe(true);

    expect(
      canAccessOrder({
        order: orderOfRestoA,
        actor: { roles: ["DRIVER"], driverId: "driver-1" },
      })
    ).toBe(true);

    expect(
      canAccessOrder({
        order: orderOfRestoA,
        actor: { roles: ["DRIVER"], driverId: "driver-2" },
      })
    ).toBe(false);
  });

  it("autorise uniquement l'invité possédant le jeton de suivi cryptographique exact", () => {
    const { rawToken, tokenHash } = generateSecureToken(24);
    const guestOrder = {
      restaurantId: null,
      isGuestOrder: true,
      guestTrackingTokenHash: tokenHash,
    };

    expect(canAccessOrder({ order: guestOrder, guestToken: rawToken })).toBe(true);
    expect(canAccessOrder({ order: guestOrder, guestToken: "faux-jeton-devine-1234567890" })).toBe(
      false
    );
    expect(canAccessOrder({ order: guestOrder, guestToken: null })).toBe(false);
    expect(canAccessOrder({ order: guestOrder, actor: { roles: ["ADMIN"] } })).toBe(true);
  });
});
