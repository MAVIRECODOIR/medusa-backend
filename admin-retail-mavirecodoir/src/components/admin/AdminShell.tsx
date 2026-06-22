import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ToastProvider } from "@/components/ui/toat";

type Props = {
  children: ReactNode;
};

export default function AdminShell({ children }: Props) {
  return (
    <ToastProvider>
      <div className="flex h-dvh">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
