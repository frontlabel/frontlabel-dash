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
      <DialogContent className="sm:max-w-lg p-6 gap-0 rounded-lg">
        <div>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="size-6 text-amber-600" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <DialogTitle className="text-base font-semibold text-foreground">
              Weet je zeker dat je {appName} wilt uitschakelen?
            </DialogTitle>
            <DialogDescription className="sr-only">
              Bevestig het uitschakelen van {appName}.
            </DialogDescription>
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted-foreground">
                Afgelopen 30 dagen heeft deze add-on naar schatting{" "}
                <span className="font-semibold text-foreground">{money},-</span> aan extra omzet en{" "}
                <span className="font-semibold text-foreground">{actions} acties</span> gegenereerd
                op je webshop.
              </p>
              <p className="text-sm text-muted-foreground">
                Door deze app uit te schakelen, mis je direct potentiële kopers die{" "}
                {getMissedAction(appSlug)}.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <Button
            className="w-full py-3 sm:col-start-2"
            onClick={() => onOpenChange(false)}
          >
            Nee, behoud deze app
          </Button>
          <Button
            variant="outline"
            className="mt-3 w-full py-3 sm:col-start-1 sm:mt-0"
            onClick={() => {
              onConfirmDisable();
              onOpenChange(false);
            }}
          >
            Ja, uitschakelen
          </Button>
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
