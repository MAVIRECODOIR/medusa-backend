"use client";

import { Shield, Lock, Users, ShoppingBag, RotateCcw, MessageSquare, Settings as SettingsIcon, Eye } from "lucide-react";

const roles = [
  {
    name: "Administrator",
    description: "Full system access — manage settings, users, and all operations",
    permissions: {
      all: true,
    },
  },
  {
    name: "Retail Staff",
    description: "Day-to-day operations — orders, returns, customers, support",
    permissions: {
      orders: true,
      returns: true,
      customers: true,
      support: true,
      dashboard: true,
      settings: false,
      users: false,
    },
  },
  {
    name: "Support Agent",
    description: "Customer-facing support with limited operational access",
    permissions: {
      support: true,
      customers: true,
      orders: false,
      returns: false,
      dashboard: true,
      settings: false,
      users: false,
    },
  },
  {
    name: "Viewer",
    description: "Read-only access to dashboards and reports",
    permissions: {
      dashboard: true,
      orders: false,
      returns: false,
      customers: false,
      support: false,
      settings: false,
      users: false,
    },
  },
];

const permissionLabels = [
  { key: "dashboard", label: "Dashboard", icon: Eye },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "returns", label: "Returns", icon: RotateCcw },
  { key: "customers", label: "Customers", icon: Users },
  { key: "support", label: "Support", icon: MessageSquare },
  { key: "settings", label: "Settings", icon: SettingsIcon },
  { key: "users", label: "User Management", icon: Lock },
];

export default function PermissionsSettingsPage() {
  return (
    <div className="animate-fade-in space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Role-based access control — managed by your infrastructure team</p>
      </div>

      <div className="card-bordered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium w-48">
                  <div className="flex items-center gap-2">
                    <Shield size={12} />
                    Role
                  </div>
                </th>
                {permissionLabels.map((p) => {
                  const Icon = p.icon;
                  return (
                    <th key={p.key} className="text-center py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Icon size={12} />
                        {p.label}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.name} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-foreground">{role.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{role.description}</p>
                  </td>
                  {permissionLabels.map((p) => {
                    const hasAccess = role.permissions.all || role.permissions[p.key as keyof typeof role.permissions];
                    return (
                      <td key={p.key} className="text-center py-4 px-2">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                            hasAccess ? "bg-success/10 text-success" : "bg-muted text-muted-foreground/40"
                          }`}
                        >
                          {hasAccess ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <Shield size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Managed by Infrastructure Team</p>
            <p className="text-xs text-muted-foreground mt-1">
              Role assignments and permission changes are handled by your infrastructure team when creating or modifying accounts.
              Contact them to request changes to your role or permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
