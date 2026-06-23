"use client";

import { useEffect, useState } from "react";
import { Package, Search, ShoppingBag } from "lucide-react";

export default function PreOrdersPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "100" });
    fetch(`/api/admin/pre-orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProducts(d.products || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(v / 100);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.variants?.some((v: any) => v.sku?.toLowerCase().includes(q));
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pre-orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Products available for pre-order (allow_backorder)</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <ShoppingBag size={14} />
          {count} pre-order products
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Error: {error}</p></div>}
      {loading && !error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Loading pre-order products...</p></div>}

      {!loading && !error && (
        <div className="card-bordered overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">SKU</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Price</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Stock</th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Variants</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) =>
                  (p.variants || []).filter((v: any) => v.allow_backorder).map((v: any) => {
                    const price = v.prices?.find((pr: any) => pr.currency_code === "gbp")?.amount;
                    return (
                      <tr key={`${p.id}-${v.id}`} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt={p.title} className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                                <Package size={16} className="text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-foreground font-medium truncate">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground">{v.title || "Default"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell font-mono text-[11px]">
                          {v.sku || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-foreground hidden md:table-cell">
                          {price ? formatCurrency(price) : "—"}
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            (v.inventory_quantity || 0) > 0
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}>
                            {v.inventory_quantity ?? 0} in stock
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/products/${p.id}`}
                            className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-block"
                          >
                            View product
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      {search ? "No products match your search." : "No products with pre-order (allow_backorder) enabled."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
