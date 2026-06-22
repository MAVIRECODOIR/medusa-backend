import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { direction: "up" | "down"; value: string };
};

export default function StatCard({ label, value, icon, trend }: Props) {
  return (
    <div className="card-bordered p-5 transition-all hover:shadow-sm hover:border-primary/20">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-medium text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={`text-[10px] tracking-[0.1em] ${
                trend.direction === "up"
                  ? "text-success"
                  : "text-danger"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.value} from last week
            </p>
          )}
        </div>
        <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}
