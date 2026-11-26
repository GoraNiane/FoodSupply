"use client";

import { signOut } from "next-auth/react";
import {
  DashboardShell,
  type NavSection,
} from "@/components/layout/dashboard-shell";

export interface PortalShellClientProps {
  portalName: string;
  userDisplayName: string;
  userRoleLabel: string;
  notificationsHref: string;
  unreadNotifications?: number;
  signOutCallbackUrl?: string;
  sections: NavSection[];
  children: React.ReactNode;
}

export function PortalShellClient({
  signOutCallbackUrl = "/connexion",
  ...props
}: PortalShellClientProps) {
  return (
    <DashboardShell
      {...props}
      onSignOut={() => {
        void signOut({ callbackUrl: signOutCallbackUrl });
      }}
    />
  );
}
