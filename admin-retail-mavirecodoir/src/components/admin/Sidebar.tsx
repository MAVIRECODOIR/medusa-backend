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
  BellDot,
  FileText,
  Tag,
  Layers,
  Warehouse,
  Percent,
  Store,
  CreditCard,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { getUserRole, hasPermission, type UserRole } from "@/lib/roles";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "canViewDashboard" as const },
  { label: "Orders", href: "/orders", icon: ShoppingBag, permission: "canViewOrders" as const },
  { label: "Draft Orders", href: "/draft-orders", icon: FileText, permission: "canCreateDraftOrders" as const },
  { label: "Products", href: "/products", icon: Shirt, permission: "canViewProducts" as const },
  { label: "Returns", href: "/returns", icon: RotateCcw, permission: "canViewReturns" as const },
  { label: "Customers", href: "/customers", icon: Users, permission: "canViewCustomers" as const },
  { label: "Customer Groups", href: "/customer-groups", icon: Layers, permission: "canViewCustomerGroups" as const },
  { label: "Promotions", href: "/promotions", icon: Tag, permission: "canViewPromotions" as const },
  { label: "Inventory", href: "/inventory", icon: Warehouse, permission: "canViewInventory" as const },
  { label: "Pricing", href: "/pricing", icon: Percent, permission: "canViewPricing" as const },
  { label: "Sales Channels", href: "/sales-channels", icon: Store, permission: "canViewSalesChannels" as const },
  { label: "Support", href: "/support", icon: MessageSquare, permission: "canViewSupport" as const },
  { label: "Back in Stock", href: "/back-in-stock", icon: Bell, permission: "canViewBackInStock" as const },
  { label: "Pre-orders", href: "/pre-orders", icon: Package, permission: "canViewPreOrders" as const },
  { label: "Notifications", href: "/notifications", icon: BellDot, permission: "canViewDashboard" as const },
];

const settingsSubItems = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Appearance", href: "/settings/appearance" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "Permissions", href: "/settings/permissions" },
  { label: "Users", href: "/settings/users", adminOnly: true },
  { label: "Change History", href: "/settings/history" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"));
  const [notifCount, setNotifCount] = useState(0);
  const [userRole, setUserRole] = useState<UserRole>(getUserRole());

  const fetchNotificationCount = useCallback(async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
      const res = await fetch(`/api/admin/audit-log/count?since=${sevenDaysAgo.toISOString()}`);
      const data = await res.json();
      setNotifCount(data.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotificationCount]);

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
        {navItems.filter(item => hasPermission(userRole, item.permission)).map((item) => {
          const isActive = pathname === item.href;
          const isNotif = item.href === "/notifications";
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
              {isNotif && notifCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </Link>
          );
        })}

        {hasPermission(userRole, "canViewSettings") && (
          <>
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
                {settingsSubItems.filter(item => !item.adminOnly || userRole === "admin").map((item) => {
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
          </>
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
