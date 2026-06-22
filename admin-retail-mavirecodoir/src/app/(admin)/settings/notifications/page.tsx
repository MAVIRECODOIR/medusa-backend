"use client";

import { Bell, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";

const toggles = [
  {
    icon: Mail,
    label: "Email Notifications",
    description: "Receive order and return updates via email",
    key: "email",
  },
  {
    icon: MessageSquare,
    label: "Push Notifications",
    description: "In-app notifications for real-time updates",
    key: "push",
  },
  {
    icon: AlertTriangle,
    label: "At-Risk Alerts",
    description: "Get notified about high-value return requests or fraud flags",
    key: "alerts",
  },
  {
    icon: Bell,
    label: "Weekly Digest",
    description: "Weekly summary of orders, returns, and customer activity",
    key: "digest",
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState({
    email: true,
    push: true,
    alerts: true,
    digest: false,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure how you receive alerts and updates</p>
      </div>

      <div className="card-bordered p-6 space-y-1">
        {toggles.map((item) => {
          const Icon = item.icon;
          const isOn = settings[item.key as keyof typeof settings];
          return (
            <div key={item.key} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
              <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0 mt-0.5">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                  isOn ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isOn ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
