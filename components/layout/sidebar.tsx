"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Server,
  Settings,
  FileText,
  Shield,
  Puzzle,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Services", href: "/admin/services", icon: Server },
  { label: "Plugins", href: "/admin/plugins", icon: Puzzle },
  { label: "Logs", href: "/admin/logs", icon: FileText },
  { label: "Paramètres", href: "/admin/settings", icon: Settings },
];

const clientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mes services", href: "/services", icon: Server },
  { label: "Mes factures", href: "/invoices", icon: FileText },
];

interface SidebarProps {
  role: "ADMIN" | "CLIENT";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = role === "ADMIN" ? adminNavItems : clientNavItems;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/50 lg:hidden",
          collapsed ? "hidden" : "block",
        )}
        onClick={() => setCollapsed(true)}
      />

      <aside
        className={cn(
          "flex flex-col border-r border-gray-200 bg-white transition-all duration-200",
          "dark:border-gray-700 dark:bg-gray-900",
          "fixed inset-y-0 left-0 z-30 lg:relative lg:translate-x-0",
          collapsed ? "-translate-x-full lg:w-16" : "translate-x-0 w-60",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <Link
              href={role === "ADMIN" ? "/admin/dashboard" : "/dashboard"}
              className="flex items-center gap-2"
            >
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white">
                ZoutaCMS
              </span>
            </Link>
          )}
          {collapsed && (
            <Shield className="h-6 w-6 text-blue-600 mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {role === "ADMIN" && (
            <div className="mb-2 px-2">
              {!collapsed && (
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              )}
            </div>
          )}
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: Profile shortcut */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Profil" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Profil</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-40 lg:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Menu className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </button>
    </>
  );
}
