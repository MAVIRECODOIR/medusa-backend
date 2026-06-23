"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, RotateCcw, Users, DollarSign, TrendingUp, Package } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import RevenueChart from "@/components/admin/RevenueChart";
import RecentOrders from "@/components/admin/RecentOrders";
import UKClock from "@/components/admin/UKClock";
import { formatPrice } from "@/lib/utils";

type DashboardData = {
  totalOrders: number;
  totalCustomers: number;
  pendingReturns: number;
  revenue: number;
  recentOrders: any[];
  monthlyRevenue: { name: string; revenue: number; orders: number }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="animate-fade-in space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Retail operations overview</p>
          </div>
          <UKClock />
        </div>
        <div className="card-bordered p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load dashboard data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Retail operations overview</p>
        </div>
        <UKClock />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={data ? String(data.totalOrders) : "..."}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          label="Pending Returns"
          value={data ? String(data.pendingReturns) : "..."}
          icon={<RotateCcw size={18} />}
        />
        <StatCard
          label="Active Customers"
          value={data ? String(data.totalCustomers) : "..."}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Revenue"
          value={data ? formatPrice(data.revenue) : "..."}
          icon={<DollarSign size={18} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="card-bordered p-5 lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">Revenue Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue and order trends</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <RevenueChart data={data?.monthlyRevenue || []} />
        </div>

        <div className="card-bordered p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">Recent Orders</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest 5 orders</p>
            </div>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <RecentOrders orders={data?.recentOrders || []} />
        </div>
      </div>
    </div>
  );
}
