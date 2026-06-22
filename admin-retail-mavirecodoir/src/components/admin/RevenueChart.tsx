"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: "Jan", revenue: 45200, orders: 142 },
  { name: "Feb", revenue: 63800, orders: 178 },
  { name: "Mar", revenue: 58100, orders: 165 },
  { name: "Apr", revenue: 72400, orders: 201 },
  { name: "May", revenue: 85900, orders: 234 },
  { name: "Jun", revenue: 92700, orders: 256 },
  { name: "Jul", revenue: 105400, orders: 289 },
  { name: "Aug", revenue: 91300, orders: 245 },
  { name: "Sep", revenue: 97800, orders: 267 },
  { name: "Oct", revenue: 111200, orders: 301 },
  { name: "Nov", revenue: 142800, orders: 378 },
  { name: "Dec", revenue: 168300, orders: 412 },
];

export default function RevenueChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(value);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
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
