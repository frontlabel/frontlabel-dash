import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown } from "lucide-react";

/** Wat bezoekers missen zodra de app uit staat, per app. */
const MISSED_ACTION: Record<string, string> = {
  "age-verification": "hun leeftijd verifiëren",
  "back-in-stock": "op voorraad-meldingen ontvangen",
  "price-alert": "een prijsmelding instellen",
  "tile-calculator": "hun benodigde hoeveelheid berekenen",
};

export function getMissedAction(slug: string) {
  return MISSED_ACTION[slug] ?? "gebruikmaken van deze functie";
}

interface DisableAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appSlug: string;
  /** Geschatte extra omzet in euro's over de afgelopen 30 dagen. */
  revenue?: number;
  /** Aantal acties (aanmeldingen, verificaties, berekeningen) afgelopen 30 dagen. */
  actions?: number;
  onConfirmDisable: () => void;
}

export function DisableAppDialog({
  open,
  onOpenChange,
  appName,
  appSlug,
  revenue = 340,
  actions = 28,
  onConfirmDisable,
}: DisableAppDialogProps) {
  const money = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(revenue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> Mogelijke omzetdaling
          </span>
          <DialogTitle className="mt-4 text-xl font-bold tracking-tight leading-snug">
            Weet je zeker dat je {appName} wilt uitschakelen?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bevestig het uitschakelen van {appName}.
          </DialogDescription>

          <div className="mt-5 rounded-lg bg-muted/60 p-4 flex gap-3">
            <TrendingDown className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              Afgelopen 30 dagen heeft deze add-on naar schatting{" "}
              <span className="font-semibold">{money},-</span> aan extra omzet en{" "}
              <span className="font-semibold">{actions} acties</span> gegenereerd op je webshop.
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Door deze app uit te schakelen, mis je direct potentiële kopers die{" "}
            {getMissedAction(appSlug)}.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <Button className="w-full py-3" onClick={() => onOpenChange(false)}>
              Nee, behoud deze app
            </Button>
            <button
              type="button"
              onClick={() => {
                onConfirmDisable();
                onOpenChange(false);
              }}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Ja, uitschakelen en risico nemen
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wrapt een app-toggle: uitschakelen vraagt eerst om bevestiging.
 */
export function useDisableAppGuard(opts: {
  appName: string;
  appSlug: string;
  active: boolean;
  setActive: (value: boolean) => void;
  revenue?: number;
  actions?: number;
}) {
  const { appName, appSlug, active, setActive, revenue, actions } = opts;
  const [open, setOpen] = useState(false);

  const requestToggle = useCallback(
    (next: boolean) => {
      if (active && !next) {
        setOpen(true);
        return;
      }
      setActive(next);
    },
    [active, setActive],
  );

  const dialog = (
    <DisableAppDialog
      open={open}
      onOpenChange={setOpen}
      appName={appName}
      appSlug={appSlug}
      {...(revenue !== undefined ? { revenue } : {})}
      {...(actions !== undefined ? { actions } : {})}
      onConfirmDisable={() => setActive(false)}
    />
  );

  return { requestToggle, dialog };
}
