"use client";

import { useState, useEffect } from "react";
import { Shield, ChevronDown } from "lucide-react";
import { getUserRole, setUserRole, type UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  support: "Support",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Full access to all features",
  manager: "Can manage orders, products, inventory, and support",
  staff: "Can view and process orders, manage inventory",
  support: "Can view orders, manage customers and support tickets",
};

export default function RoleSwitcher() {
  const [currentRole, setCurrentRole] = useState<UserRole>(getUserRole());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentRole(getUserRole());
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setCurrentRole(role);
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted transition-colors"
      >
        <Shield size={14} />
        <span className="font-medium">{roleLabels[currentRole]}</span>
        <ChevronDown size={12} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-background shadow-lg z-20">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-medium text-foreground">Switch Role</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">For testing purposes</p>
            </div>
            <div className="p-2">
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg p-2 text-left transition-colors",
                    currentRole === role
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium">{roleLabels[role]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{roleDescriptions[role]}</p>
                  </div>
                  {currentRole === role && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
