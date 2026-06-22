import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

type Props = { children: ReactNode };

export default function AdminLayout({ children }: Props) {
  return <AdminShell>{children}</AdminShell>;
}
