import { ShoppingBag, RotateCcw, Users, DollarSign } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.05em] text-[#E8EAED]">
          Dashboard
        </h1>
        <p className="mt-1 text-xs tracking-[0.1em] text-[#9AA0A8]">
          Retail operations overview
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value="—"
          icon={<ShoppingBag size={20} />}
        />
        <StatCard
          label="Pending Returns"
          value="—"
          icon={<RotateCcw size={20} />}
        />
        <StatCard
          label="Active Customers"
          value="—"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Revenue (MTD)"
          value="—"
          icon={<DollarSign size={20} />}
        />
      </div>

      <div className="rounded-xl border border-[#2A303A] bg-[#1A1F26] p-6">
        <h2 className="mb-4 text-sm font-medium tracking-[0.08em] text-[#E8EAED]">
          Recent Orders
        </h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-xs tracking-[0.1em] text-[#5A6068]">
            Connect to Medusa backend to view live data
          </p>
        </div>
      </div>
    </div>
  );
}
