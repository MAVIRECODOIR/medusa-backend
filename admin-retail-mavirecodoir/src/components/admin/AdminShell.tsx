import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: ReactNode;
};

export default function AdminShell({ children }: Props) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0F1419] p-8">
        {children}
      </main>
    </div>
  );
}
