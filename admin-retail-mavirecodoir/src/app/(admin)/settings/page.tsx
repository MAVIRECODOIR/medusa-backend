import Link from "next/link";
import { User, Palette, Bell, Shield, ChevronRight } from "lucide-react";

const sections = [
  { label: "Profile", href: "/settings/profile", icon: User, description: "Name, email, and role details" },
  { label: "Appearance", href: "/settings/appearance", icon: Palette, description: "Theme and display preferences" },
  { label: "Notifications", href: "/settings/notifications", icon: Bell, description: "Email and push notification settings" },
  { label: "Permissions", href: "/settings/permissions", icon: Shield, description: "Role-based access control" },
];

export default function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="card-bordered p-5 flex items-center gap-4 transition-all hover:shadow-sm hover:border-primary/20 group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shrink-0">
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{section.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
