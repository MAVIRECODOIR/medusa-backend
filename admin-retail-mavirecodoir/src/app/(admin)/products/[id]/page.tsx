"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProduct(d.product || d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const formatCurrency = (v: number, currency?: string) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP", minimumFractionDigits: 2 }).format(v / 100);

  if (loading) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Loading product...</div>;
  if (error) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Error: {error}</div>;
  if (!product) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Product not found.</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <a href="/products" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Products
      </a>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden flex items-center justify-center">
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <Package size={32} className="text-muted-foreground/50" />
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {(product.images || []).map((img: any) => (
                <div key={img.id} className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-bordered p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{product.title || "Untitled"}</h1>
                {product.subtitle && <p className="text-sm text-muted-foreground mt-1">{product.subtitle}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium shrink-0 ${product.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {product.status || "draft"}
              </span>
            </div>
            {product.description && <p className="text-sm text-foreground mt-4">{product.description}</p>}
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <ShoppingBag size={14} className="text-muted-foreground" /> Variants ({(product.variants || []).length})
            </h2>
            {(product.variants?.length > 0) ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">SKU</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Title</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Price</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Inventory</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Allow Backorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(product.variants || []).map((v: any) => (
                      <tr key={v.id} className="border-b border-border last:border-b-0">
                        <td className="py-2 px-2 text-muted-foreground font-mono text-[11px]">{v.sku || "—"}</td>
                        <td className="py-2 px-2 text-foreground">{v.title || "—"}</td>
                        <td className="py-2 px-2 text-foreground font-medium">
                          {v.calculated_price
                            ? formatCurrency(v.calculated_price, v.calculated_price.currency_code)
                            : v.prices?.[0]
                            ? formatCurrency(v.prices[0].amount, v.prices[0].currency_code)
                            : "—"}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-xs ${(v.inventory_quantity || 0) > 0 ? "text-success" : "text-destructive"}`}>
                            {v.inventory_quantity ?? "?"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{v.allow_backorder ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No variants</p>
            )}
          </div>

          {product.handle && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-2">Storefront Link</h2>
              <p className="text-xs text-muted-foreground">
                <a href={`https://www.mavirecodoir.com/products/${product.handle}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  www.mavirecodoir.com/products/{product.handle}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
