import type { RoleCode } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: RoleCode[];
      sessionVersion: number;
      restaurantId?: string | null;
      supplierId?: string | null;
      driverId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles: RoleCode[];
    sessionVersion: number;
    restaurantId?: string | null;
    supplierId?: string | null;
    driverId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: RoleCode[];
    sessionVersion: number;
    restaurantId?: string | null;
    supplierId?: string | null;
    driverId?: string | null;
  }
}
