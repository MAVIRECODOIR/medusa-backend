import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { direction: "up" | "down"; value: string };
};

export default function StatCard({ label, value, icon, trend }: Props) {
  return (
    <div className="rounded-xl border border-[#2A303A] bg-[#1A1F26] p-6 transition-colors hover:border-[#C4A265]/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9AA0A8]">
            {label}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-[#E8EAED]">
            {value}
          </p>
          {trend && (
            <p
              className={`mt-1 text-[10px] tracking-[0.1em] ${
                trend.direction === "up"
                  ? "text-[#22C55E]"
                  : "text-[#EF4444]"
              }`}
            >
              {trend.direction === "up" ? "+" : "-"}
              {trend.value} from last week
            </p>
          )}
        </div>
        <div className="rounded-lg bg-[#C4A265]/10 p-3 text-[#C4A265]">
          {icon}
        </div>
      </div>
    </div>
  );
}
