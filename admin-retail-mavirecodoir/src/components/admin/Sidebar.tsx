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
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Returns", href: "/returns", icon: RotateCcw },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Support", href: "/support", icon: MessageSquare },
  { label: "Back in Stock", href: "/back-in-stock", icon: Bell },
  { label: "Pre-orders", href: "/pre-orders", icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-dvh w-64 flex-col border-r border-[#2A303A] bg-[#0F1419]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#2A303A] px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C4A265]">
          <span className="text-xs font-bold text-[#0F1419]">M</span>
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm font-medium tracking-[0.08em] text-[#E8EAED]">
            MAVIRE
          </p>
          <p className="text-[9px] tracking-[0.15em] text-[#5A6068]">
            ADMIN PORTAL
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] transition-all ${
                isActive
                  ? "bg-[#C4A265]/10 text-[#C4A265]"
                  : "text-[#9AA0A8] hover:bg-[#1A1F26] hover:text-[#E8EAED]"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-[#2A303A] px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs tracking-[0.08em] text-[#9AA0A8] transition-all hover:bg-[#1A1F26] hover:text-red-400"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
