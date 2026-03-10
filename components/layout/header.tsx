"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { User, LogOut, Settings, Sun, Moon, ChevronDown, Bell } from "lucide-react";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  title?: string;
  /** Pass true in the admin layout so signOut clears the admin session cookie. */
  adminPortal?: boolean;
}

export function Header({ user, title, adminPortal }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openIncidents, setOpenIncidents] = useState(0);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  // Poll open incidents count for admin portal
  useEffect(() => {
    if (!adminPortal) return;
    const fetchIncidents = async () => {
      try {
        const res = await fetch("/api/admin/monitoring/alerts?open=true");
        const json = await res.json();
        if (json.success) setOpenIncidents(json.data.length);
      } catch { /* ignore */ }
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 60_000);
    return () => clearInterval(interval);
  }, [adminPortal]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Page title */}
      <div className="flex items-center gap-4">
        <div className="ml-10 lg:ml-0">
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Alert badge (admin only) */}
        {adminPortal && (
          <Link
            href="/admin/monitoring"
            className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Monitoring"
          >
            <Bell className="h-4 w-4" />
            {openIncidents > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {openIncidents > 9 ? "9+" : openIncidents}
              </span>
            )}
          </Link>
        )}
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Toggle dark mode"
        >
          {mounted && (resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          ))}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                {user.name ?? user.email}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user.role?.toLowerCase() === "admin" ? "Administrateur" : "Client"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 mb-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs truncate">{user.email}</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Mon profil
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>

                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                <button
                  onClick={async () => {
                    if (adminPortal) {
                      // Sign out from the admin-auth instance (separate cookie)
                      const csrfRes = await fetch("/api/admin-auth/csrf");
                      const { csrfToken } = await csrfRes.json();
                      await fetch("/api/admin-auth/signout", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({ csrfToken, json: "true" }).toString(),
                      });
                      router.push("/admin/login");
                    } else {
                      await signOut({ redirect: false });
                      router.push("/login");
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
