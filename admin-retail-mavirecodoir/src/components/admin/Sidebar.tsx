"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  RotateCcw,
  Users,
  MessageSquare,
  Bell,
  Package,
  Settings,
  ChevronDown,
  LogOut,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Products", href: "/products", icon: Shirt },
  { label: "Returns", href: "/returns", icon: RotateCcw },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Support", href: "/support", icon: MessageSquare },
  { label: "Back in Stock", href: "/back-in-stock", icon: Bell },
  { label: "Pre-orders", href: "/pre-orders", icon: Package },
];

const settingsSubItems = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Appearance", href: "/settings/appearance" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "Permissions", href: "/settings/permissions" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center border-b border-sidebar-border px-6 py-5">
        <img
          src="https://cdn.mavirecodoir.com/brand/logos/png/1771394628214-zkowej-Mavire%20Codoir%20-%20LOGO.webp"
          alt="MAVIRE CODOIR"
          className="h-7 object-contain"
        />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-sidebar-border" />

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] transition-all",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground"
          )}
        >
          <Settings size={16} />
          Settings
          <ChevronDown
            size={14}
            className={cn(
              "ml-auto transition-transform",
              settingsOpen && "rotate-180"
            )}
          />
        </button>

        {settingsOpen && (
          <div className="ml-6 space-y-0.5">
            {settingsSubItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-xs tracking-[0.08em] transition-all",
                    isActive
                      ? "text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-muted-foreground hover:text-sidebar-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] text-sidebar-muted-foreground transition-all hover:bg-sidebar-muted hover:text-destructive"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
