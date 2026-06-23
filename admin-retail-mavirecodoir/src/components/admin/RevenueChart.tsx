"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  data: { name: string; revenue: number; orders: number }[];
};

const FALLBACK_DATA = [
  { name: "Jan", revenue: 0, orders: 0 },
  { name: "Feb", revenue: 0, orders: 0 },
  { name: "Mar", revenue: 0, orders: 0 },
  { name: "Apr", revenue: 0, orders: 0 },
  { name: "May", revenue: 0, orders: 0 },
  { name: "Jun", revenue: 0, orders: 0 },
  { name: "Jul", revenue: 0, orders: 0 },
  { name: "Aug", revenue: 0, orders: 0 },
  { name: "Sep", revenue: 0, orders: 0 },
  { name: "Oct", revenue: 0, orders: 0 },
  { name: "Nov", revenue: 0, orders: 0 },
  { name: "Dec", revenue: 0, orders: 0 },
];

export default function RevenueChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  const chartData = data.length > 0 ? data : FALLBACK_DATA;
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(value);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <Tooltip
            formatter={(value: any, name: any) => [
              name === "revenue" ? formatCurrency(Number(value)) : value,
              name === "revenue" ? "Revenue" : "Orders",
            ]}
            contentStyle={{
              backgroundColor: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
