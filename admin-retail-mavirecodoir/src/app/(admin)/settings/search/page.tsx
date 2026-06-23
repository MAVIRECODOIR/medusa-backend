"use client";

import { useEffect, useState } from "react";
import { Globe, Search, RefreshCw, BarChart3, Save } from "lucide-react";

export default function SearchConfigurationPage() {
  const [searchConfig, setSearchConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch search configuration from API
    fetch("/api/admin/search-config")
      .then((r) => r.json())
      .then((d) => {
        setSearchConfig(d.config || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Search Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure search engine integration and indexing settings
        </p>
      </div>

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Search Engine Provider</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Globe size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Algolia</p>
                <p className="text-sm text-muted-foreground">Fast, relevant search with typo tolerance and faceting</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              Configure
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Search size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Meilisearch</p>
                <p className="text-sm text-muted-foreground">Open-source search engine with instant search</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              Configure
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Globe size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">Typesense</p>
                <p className="text-sm text-muted-foreground">Open-source alternative to Algolia</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              Configure
            </button>
          </div>
        </div>
      </div>

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Indexing Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-index Products</p>
              <p className="text-xs text-muted-foreground">Automatically index products when created or updated</p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              {searchConfig?.auto_index ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Index Variants</p>
              <p className="text-xs text-muted-foreground">Include product variants in search index</p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              {searchConfig?.index_variants ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Index Categories</p>
              <p className="text-xs text-muted-foreground">Include categories and collections in search</p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
              {searchConfig?.index_categories ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
      </div>

      <div className="card-bordered p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Search Analytics</h3>
          <button className="px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors flex items-center gap-2">
            <BarChart3 size={14} />
            View Analytics
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg text-center">
              <p className="text-2xl font-semibold text-foreground">{searchConfig?.total_searches || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Searches</p>
            </div>
            <div className="p-4 border border-border rounded-lg text-center">
              <p className="text-2xl font-semibold text-foreground">{searchConfig?.unique_queries || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Unique Queries</p>
            </div>
            <div className="p-4 border border-border rounded-lg text-center">
              <p className="text-2xl font-semibold text-foreground">{searchConfig?.click_through_rate || "0%"}</p>
              <p className="text-xs text-muted-foreground mt-1">Click-through Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-bordered p-6">
        <h3 className="font-medium text-foreground mb-4">Index Management</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <RefreshCw size={16} />
            Reindex All Products
          </button>
          <button className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors">
            Clear Index
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Last indexed: {searchConfig?.last_indexed ? new Date(searchConfig.last_indexed).toLocaleString() : "Never"}
        </p>
      </div>
    </div>
  );
}
