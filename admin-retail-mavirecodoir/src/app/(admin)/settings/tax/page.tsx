"use client";

import { useEffect, useState } from "react";
import { Receipt, Globe, Plus, Search, Save } from "lucide-react";

export default function TaxConfigurationPage() {
  const [taxRegions, setTaxRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch tax regions from Medusa API
    fetch("/api/admin/tax-regions")
      .then((r) => r.json())
      .then((d) => {
        setTaxRegions(d.tax_regions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Tax Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure tax rates and rules per region
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tax regions..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus size={16} />
          Add Tax Region
        </button>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading tax configuration...</p>
        </div>
      ) : taxRegions.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Receipt size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tax regions configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add tax regions to configure tax rates for different countries
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Country Code</th>
                <th className="px-4 py-3 font-medium">Default Rate</th>
                <th className="px-4 py-3 font-medium">Tax Provider</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxRegions.map((region) => (
                <tr key={region.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-muted-foreground" />
                      {region.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{region.country_code || "-"}</td>
                  <td className="px-4 py-3 text-sm">{region.default_tax_rate ? `${region.default_tax_rate}%` : "-"}</td>
                  <td className="px-4 py-3 text-sm">{region.provider || "System"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${region.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {region.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-primary hover:underline text-xs mr-2">Edit Rates</button>
                    <button className="text-primary hover:underline text-xs">Configure</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Tax Provider Integration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Avalara</p>
              <p className="text-sm text-muted-foreground">Automated tax calculation for US and international sales</p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              Configure
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">TaxJar</p>
              <p className="text-sm text-muted-foreground">Sales tax automation and reporting</p>
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
