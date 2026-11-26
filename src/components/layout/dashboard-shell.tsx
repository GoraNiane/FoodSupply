"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface DashboardShellProps {
  portalName: string;
  userDisplayName: string;
  userRoleLabel: string;
  notificationsHref: string;
  unreadNotifications?: number;
  sections: NavSection[];
  onSignOut?: () => void;
  children: React.ReactNode;
}

export function DashboardShell({
  portalName,
  userDisplayName,
  userRoleLabel,
  notificationsHref,
  unreadNotifications = 0,
  sections,
  onSignOut,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const renderNav = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy-900 via-navy-900 to-ink-900 text-white">
      <div className="flex h-16 items-center justify-between border-b border-navy-800 px-5">
        <BrandLogo href="/" variant="dark" subtitle={portalName} />
        <button
          type="button"
          className="rounded-lg p-1.5 text-navy-200 hover:bg-navy-800 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label={`Menu ${portalName}`}>
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isRootPortal =
                item.href === "/restaurant" ||
                item.href === "/fournisseur" ||
                item.href === "/livreur" ||
                item.href === "/admin";
              const active = isRootPortal
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-navy-100 hover:bg-navy-800 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="shrink-0 opacity-90">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        active ? "bg-white/20 text-white" : "bg-brand-500 text-white"
                      )}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-navy-800 p-3">
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        ) : (
          <Link
            href="/connexion"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 lg:fixed lg:inset-y-0 lg:block">{renderNav()}</aside>

      {/* Sidebar Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw]">{renderNav()}</aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-navy-900 hover:bg-surface-subtle lg:hidden"
              aria-label="Ouvrir la navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:inline">
              {portalName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={notificationsHref}
              className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-surface-subtle hover:text-navy-900"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2.5 rounded-xl border border-surface-border bg-surface-muted px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                {userDisplayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold leading-tight text-navy-900">
                  {userDisplayName}
                </p>
                <p className="text-[11px] leading-tight text-slate-500">{userRoleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
