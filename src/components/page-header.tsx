import { useEffect, type ReactNode } from "react";
import { useShellHeader } from "@/components/shell-header-context";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optional custom breadcrumb content for the sticky topbar (defaults to the title). */
  breadcrumb?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  const { setContent } = useShellHeader();

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          {breadcrumb ?? <span className="text-foreground truncate">{title}</span>}
        </nav>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>,
    );
    return () => setContent(null);
  }, [title, breadcrumb, actions, setContent]);

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}