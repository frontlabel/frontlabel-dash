import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PanelRight, Square } from "lucide-react";

export type DisplayMode = "popup" | "drawer";

export function DisplayModeField({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (v: DisplayMode) => void;
}) {
  const options: {
    id: DisplayMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "popup",
      label: "Popup",
      description: "Gecentreerd venster boven de pagina.",
      icon: <Square className="h-4 w-4" />,
    },
    {
      id: "drawer",
      label: "Drawer",
      description: "Schuift in vanaf de rechterkant, volledige hoogte.",
      icon: <PanelRight className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-2">
      <Label>Weergavevorm</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                "flex flex-col items-start gap-1 text-left p-3 rounded-lg border transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {o.icon}
                {o.label}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {o.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}