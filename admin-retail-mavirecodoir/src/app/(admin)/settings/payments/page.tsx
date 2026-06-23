"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Search, Lock, CheckCircle } from "lucide-react";

export default function PaymentMethodsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch payment providers and saved methods from Medusa API
    Promise.all([
      fetch("/api/admin/payment-providers").then((r) => r.json()),
      fetch("/api/admin/saved-payment-methods").then((r) => r.json()),
    ])
      .then(([provData, methodsData]) => {
        setProviders(provData.providers || []);
        setSavedMethods(methodsData.methods || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Payment Methods</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure payment providers and manage saved payment methods
        </p>
      </div>

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Payment Providers</h3>
        {loading ? (
          <p className="text-muted-foreground">Loading payment providers...</p>
        ) : providers.length === 0 ? (
          <p className="text-muted-foreground">No payment providers configured</p>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">{provider.type || "Standard"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.is_enabled ? (
                    <span className="flex items-center gap-1 text-success text-sm">
                      <CheckCircle size={14} />
                      Enabled
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Disabled</span>
                  )}
                  <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-bordered p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Saved Payment Methods</h3>
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search saved methods..."
              className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {savedMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No saved payment methods yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Customers can save payment methods for faster checkout
            </p>
          </div>
        ) : (
          <div className="card-bordered overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Last 4 Digits</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedMethods.map((method) => (
                  <tr key={method.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm">{method.customer_email || "Unknown"}</td>
                    <td className="px-4 py-3 text-sm">{method.provider || "Stripe"}</td>
                    <td className="px-4 py-3 text-sm font-mono">•••• {method.last4 || "----"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{method.expires || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${method.is_default ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {method.is_default ? "Default" : "Saved"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button className="text-primary hover:underline text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">PCI Compliance</p>
                <p className="text-sm text-muted-foreground">Ensure payment processing meets PCI DSS standards</p>
              </div>
            </div>
            <span className="text-success text-sm">Compliant</span>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">3D Secure</p>
                <p className="text-sm text-muted-foreground">Require 3D Secure authentication for card payments</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
