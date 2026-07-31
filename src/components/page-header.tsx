import { useEffect, type ReactNode } from "react";
import { useShellHeader } from "@/components/shell-header-context";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { setContent } = useShellHeader();

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-foreground font-medium truncate">{title}</span>
          {subtitle && (
            <span className="hidden md:inline text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>,
    );
    return () => setContent(null);
  }, [title, subtitle, actions, setContent]);

  return null;
}