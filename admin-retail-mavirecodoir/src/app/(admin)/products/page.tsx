"use client";

import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit), fields: "id,title,subtitle,thumbnail,status,collection_id" });
    if (search) params.set("q", search);
    fetch(`/api/admin/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProducts(d.products || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(v / 100);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Product catalog browser</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Package size={14} />
          {count} products
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Could not load products: {error}</p></div>}
      {loading && !error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Loading products...</p></div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p: any) => (
            <a
              key={p.id}
              href={`/products/${p.id}`}
              className="card-bordered overflow-hidden group hover:shadow-sm transition-all"
            >
              <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Package size={24} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.title || "Untitled"}</p>
                {p.subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.subtitle}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {p.status || "draft"}
                  </span>
                </div>
              </div>
            </a>
          ))}
          {products.length === 0 && (
            <div className="col-span-full card-bordered p-12 text-center text-sm text-muted-foreground">No products found.</div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
