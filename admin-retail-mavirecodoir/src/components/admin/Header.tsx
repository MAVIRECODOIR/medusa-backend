"use client";

import { useTheme } from "@/components/theme-provider";
import { Bell, Sun, Moon, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import RoleSwitcher from "./RoleSwitcher";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-header backdrop-blur-xl border-b border-border">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search orders, customers..."
              className="w-full h-9 rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <RoleSwitcher />

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-[9px] font-medium text-white flex items-center justify-center">3</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <User className="h-4 w-4" />
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-56 surface-elevated py-1.5 border border-border">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Admin User</p>
                  <p className="text-xs text-muted-foreground">admin@mavirecodoir.com</p>
                </div>
                <a href="/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </a>
                <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  Settings
                </a>
                <div className="border-t border-border mt-1 pt-1">
                  <a href="/api/auth/logout" className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                    Sign Out
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
