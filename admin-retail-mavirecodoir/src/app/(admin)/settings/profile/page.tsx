"use client";

import { User, Mail, Shield, Save } from "lucide-react";
import { useState } from "react";

export default function ProfileSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and account details</p>
      </div>

      <form onSubmit={handleSave} className="card-bordered p-6 space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-medium">
            AU
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">First Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                defaultValue="Admin"
                className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Last Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                defaultValue="User"
                className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              defaultValue="admin@mavirecodoir.com"
              className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Role</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              defaultValue="Administrator"
              disabled
              className="w-full h-10 rounded-lg border border-input bg-muted pl-9 pr-3 text-sm text-muted-foreground outline-none cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Role is managed by your infrastructure team</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
