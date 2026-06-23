"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function CreateDraftOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    first_name: "",
    last_name: "",
    address_1: "",
    city: "",
    postal_code: "",
    country_code: "GB",
  });
  const [regionId, setRegionId] = useState("");
  const [regions, setRegions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/regions")
      .then((r) => r.json())
      .then((d) => setRegions(d.regions || []))
      .catch(console.error);
  }, []);

  const searchProducts = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/products?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addProduct = (product: any) => {
    if (selectedProducts.find((p) => p.id === product.id)) return;
    setSelectedProducts([...selectedProducts, { ...product, quantity: 1, variant_id: product.variants?.[0]?.id }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(selectedProducts.map((p) => (p.id === productId ? { ...p, quantity } : p)));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => {
      const price = p.variants?.[0]?.prices?.[0]?.amount || 0;
      return sum + price * p.quantity;
    }, 0);
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError("Please add at least one product");
      return;
    }
    if (!customerEmail) {
      setError("Please enter customer email");
      return;
    }
    if (!regionId) {
      setError("Please select a region");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/draft-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          first_name: customerName.split(" ")[0] || "",
          last_name: customerName.split(" ").slice(1).join(" ") || "",
          shipping_address: shippingAddress,
          region_id: regionId,
          items: selectedProducts.map((p) => ({
            variant_id: p.variant_id,
            quantity: p.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push(`/draft-orders/${data.draft_order.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <a href="/draft-orders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Draft Orders
      </a>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create Draft Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new draft order for a customer</p>
      </div>

      {error && (
        <div className="card-bordered p-4 bg-destructive/10 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Customer Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Email *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Shipping Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">First Name</label>
                <input
                  type="text"
                  value={shippingAddress.first_name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, first_name: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={shippingAddress.last_name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, last_name: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Address Line 1</label>
                <input
                  type="text"
                  value={shippingAddress.address_1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address_1: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">City</label>
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Postal Code</label>
                <input
                  type="text"
                  value={shippingAddress.postal_code}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Country</label>
                <select
                  value={shippingAddress.country_code}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country_code: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="IE">Ireland</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Region Selection */}
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Region</h2>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            >
              <option value="">Select a region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.currency_code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Add Products */}
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Add Products</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            {searching && <p className="text-xs text-muted-foreground mt-2">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                  >
                    {p.thumbnail && <img src={p.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      {p.subtitle && <p className="text-xs text-muted-foreground truncate">{p.subtitle}</p>}
                    </div>
                    <Plus size={16} className="text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">Selected Products</h2>
              <div className="space-y-3">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    {p.thumbnail && <img src={p.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(p.variants?.[0]?.prices?.[0]?.amount || 0, "GBP")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(p.id, p.quantity - 1)}
                        className="w-7 h-7 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm w-6 text-center">{p.quantity}</span>
                      <button
                        onClick={() => updateQuantity(p.id, p.quantity + 1)}
                        className="w-7 h-7 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(calculateTotal(), "GBP")}</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-3 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatPrice(calculateTotal(), "GBP")}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || selectedProducts.length === 0}
            className="w-full h-10 rounded-lg bg-foreground text-foreground-foreground text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Draft Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
