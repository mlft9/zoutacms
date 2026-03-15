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
  Activity,
  ChevronLeft,
  Menu,
  Package,
  Tag,
  ShoppingCart,
  Receipt,
  ShoppingBag,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Gestion",
    items: [
      { label: "Clients", href: "/admin/clients", icon: Users },
      { label: "Services", href: "/admin/services", icon: Server },
      { label: "Groupes de produits", href: "/admin/products", icon: Package },
      { label: "Produits", href: "/admin/plans", icon: Tag },
      { label: "Commandes", href: "/admin/orders", icon: ShoppingCart },
      { label: "Factures", href: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Plugins", href: "/admin/plugins", icon: Puzzle },
      { label: "Monitoring", href: "/admin/monitoring", icon: Activity },
      { label: "Logs", href: "/admin/logs", icon: FileText },
    ],
  },
];

const clientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Catalogue", href: "/catalog", icon: ShoppingBag },
  { label: "Mes commandes", href: "/orders", icon: ClipboardList },
  { label: "Mes services", href: "/services", icon: Server },
  { label: "Mes factures", href: "/invoices", icon: Receipt },
];

interface SidebarProps {
  role: "ADMIN" | "CLIENT";
}

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <li>
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
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {role === "ADMIN" ? (
            adminNavGroups.map((group, i) => (
              <div key={i}>
                {group.label && !collapsed && (
                  <p className="mb-1 px-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {group.label && collapsed && i > 0 && (
                  <div className="mx-2 border-t border-gray-200 dark:border-gray-700 mb-1" />
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul className="space-y-0.5">
              {clientNavItems.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </ul>
          )}
        </nav>

        {/* Bottom: Settings (admin) or Profile (client) */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          {role === "ADMIN" ? (
            <Link
              href="/admin/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin/settings")
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? "Paramètres" : undefined}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Paramètres</span>}
            </Link>
          ) : (
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
          )}
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
