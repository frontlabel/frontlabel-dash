import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-1">
      {children}
    </h3>
  );
}

export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}