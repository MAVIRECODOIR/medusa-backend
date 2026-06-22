"use client";

import { Palette, Monitor, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Appearance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customize the look and feel of your admin portal</p>
      </div>

      <div className="card-bordered p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Palette size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-muted-foreground">Choose between light and dark mode</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setTheme("light")}
            className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
              theme === "light"
                ? "border-primary bg-accent"
                : "border-border hover:border-muted-foreground/30 bg-background"
            }`}
          >
            {theme === "light" && (
              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[#FAF8F5] border border-[rgba(26,26,46,0.06)]">
              <Sun className="h-8 w-8 text-[#C4A265]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Light</p>
              <p className="text-[10px] text-muted-foreground">Warm, clean interface</p>
            </div>
          </button>

          <button
            onClick={() => setTheme("dark")}
            className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
              theme === "dark"
                ? "border-primary bg-accent"
                : "border-border hover:border-muted-foreground/30 bg-background"
            }`}
          >
            {theme === "dark" && (
              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]">
              <Moon className="h-8 w-8 text-[#C4A265]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Dark</p>
              <p className="text-[10px] text-muted-foreground">Elegant, low-light viewing</p>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Sync with system</p>
              <p className="text-xs text-muted-foreground">Automatically match your OS theme</p>
            </div>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted-foreground/30 cursor-not-allowed opacity-50">
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow-sm translate-x-0.5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground -mt-3">Coming soon — system theme sync is on the roadmap</p>
      </div>
    </div>
  );
}
