import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { useShellHeader } from "@/components/shell-header-context";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronRight,
  ImageIcon,
  LayoutGrid,
  Mail,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/shops/$shopId/apps/back-in-stock",
)({
  component: BackInStockPage,
});

function BackInStockPage() {
  const { shopId } = Route.useParams();
  const { setContent } = useShellHeader();
  const [active, setActive] = useState(true);
  const [tab, setTab] = useState<"overview" | "widget" | "email" | "waitlist">("overview");

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
          <Link
            to="/shops/$shopId/apps"
            params={{ shopId }}
            className="text-foreground hover:underline truncate"
          >
            Apps
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate">Terug-op-voorraad meldingen</span>
        </nav>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Switch id="app-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="app-active" className="cursor-pointer">
            {active ? "Actief" : "Uit"}
          </Label>
        </div>
      </div>,
    );
    return () => setContent(null);
  }, [shopId, active, setContent]);

  // Widget-ontwerp state
  const [buttonText, setButtonText] = useState("Meld me wanneer beschikbaar");
  const [buttonColor, setButtonColor] = useState("#111827");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  // E-mail configuratie state
  const [emailSubject, setEmailSubject] = useState(
    "Goed nieuws — {product} is weer op voorraad!",
  );
  const [brandColor, setBrandColor] = useState("#111827");
  const [customMessage, setCustomMessage] = useState(
    "Hi {name}, het product waarop je wachtte is weer beschikbaar. Wees er snel bij voordat het opnieuw uitverkocht is!",
  );
  const [scarcityUrgency, setScarcityUrgency] = useState(true);

  // Wachtlijst state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const topProducts = useMemo(
    () => [
      { name: "Selvedge spijkerjas", stock: 0, waitlist: 84, value: "€2.520" },
      { name: "Merino trui — Crème", stock: 0, waitlist: 61, value: "€1.830" },
      { name: "Suède Chelsea boots", stock: 2, waitlist: 47, value: "€1.645" },
      { name: "Linnen overshirt — Olijf", stock: 0, waitlist: 39, value: "€1.170" },
      { name: "Wollen muts — Antraciet", stock: 0, waitlist: 28, value: "€420" },
    ],
    [],
  );

  const waitlist = useMemo(
    () => [
      { email: "anna.devries@example.com", product: "Selvedge spijkerjas", date: "12-06-2026", status: "Pending" as const },
      { email: "lukas.b@example.com", product: "Merino trui — Crème", date: "11-06-2026", status: "Notified" as const },
      { email: "sophie.k@example.com", product: "Suède Chelsea boots", date: "10-06-2026", status: "Purchased" as const },
      { email: "marc.j@example.com", product: "Linnen overshirt — Olijf", date: "09-06-2026", status: "Pending" as const },
      { email: "emma.t@example.com", product: "Selvedge spijkerjas", date: "08-06-2026", status: "Notified" as const },
      { email: "noah.p@example.com", product: "Wollen muts — Antraciet", date: "07-06-2026", status: "Pending" as const },
      { email: "lisa.m@example.com", product: "Merino trui — Crème", date: "06-06-2026", status: "Purchased" as const },
    ],
    [],
  );

  const filteredWaitlist = waitlist.filter((w) => {
    const matchesSearch =
      !search ||
      w.email.toLowerCase().includes(search.toLowerCase()) ||
      w.product.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: "overview" as const, label: "Overzicht & analyses" },
    { id: "widget" as const, label: "Widget-ontwerp" },
    { id: "email" as const, label: "E-mail configuratie" },
    { id: "waitlist" as const, label: "Wachtlijst" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Terug-op-voorraad meldingen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zet uitverkochte producten om in teruggewonnen omzet.
        </p>
      </div>
      <div className="px-6 mt-4 border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6">
        {tab === "overview" && (
          <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Teruggewonnen omzet"
              value="€3,450"
              valueClassName="text-emerald-600"
              badge="+12% deze maand"
              badgeTone="success"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="E-mails verzonden"
              value="412"
              icon={<Mail className="h-4 w-4" />}
            />
            <MetricCard
              label="Conversieratio"
              value="18.5%"
              icon={<Bell className="h-4 w-4" />}
            />
          </div>

          <div>
            <SectionLabel>Meest aangevraagde producten</SectionLabel>
            <SectionCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px] pl-4">Foto</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="text-right">Voorraad</TableHead>
                    <TableHead className="text-right">Wachtlijst</TableHead>
                    <TableHead className="text-right pr-4">Potentiële waarde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="pl-4">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">
                        {p.stock === 0 ? (
                          <Badge variant="destructive" className="text-xs">Uitverkocht</Badge>
                        ) : (
                          <span className="text-sm">{p.stock}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{p.waitlist}</TableCell>
                      <TableCell className="text-right pr-4 font-medium">{p.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
          </div>
        )}

        {tab === "widget" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Instellingen</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="btnText">Knoptekst</Label>
                  <Input
                    id="btnText"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Knopkleur</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="h-9 w-12 rounded border border-input cursor-pointer bg-card"
                    />
                    <Input
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="newsletter"
                    checked={newsletterOptIn}
                    onCheckedChange={(v) => setNewsletterOptIn(Boolean(v))}
                  />
                  <Label htmlFor="newsletter" className="cursor-pointer leading-tight">
                    Voeg een nieuwsbrief-opt-in toe om leads te verzamelen
                  </Label>
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionLabel>Live voorbeeld</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-md border border-border bg-background p-5">
                  <div className="grid grid-cols-[120px_1fr] gap-4">
                    <div className="h-32 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Jassen
                      </div>
                      <div className="font-semibold text-base leading-tight">
                        Selvedge spijkerjas
                      </div>
                      <div className="text-sm font-medium">€189,00</div>
                      <Badge variant="destructive" className="text-xs">Uitverkocht</Badge>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: buttonColor }}
                    >
                      {buttonText || "Meld me wanneer beschikbaar"}
                    </button>
                    {newsletterOptIn && (
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" defaultChecked className="mt-0.5" />
                        <span>Ja, stuur me ook af en toe updates en aanbiedingen.</span>
                      </label>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {tab === "email" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Instellingen</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Onderwerp</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bedrijfslogo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/40">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm" type="button">
                      <Upload className="h-4 w-4" /> Upload logo
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Merkkleur</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-9 w-12 rounded border border-input cursor-pointer bg-card"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Persoonlijk bericht</Label>
                  <Textarea
                    id="msg"
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="urgency" className="cursor-pointer">
                      Voeg urgentie toe
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Voegt regels toe zoals "Nog maar enkele beschikbaar!" om conversie te verhogen.
                    </p>
                  </div>
                  <Switch
                    id="urgency"
                    checked={scarcityUrgency}
                    onCheckedChange={setScarcityUrgency}
                  />
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionLabel>Voorbeeld</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                  <div
                    className="h-2"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div className="p-6 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Onderwerp: <span className="text-foreground">{emailSubject}</span>
                    </div>
                    <div className="rounded-md bg-muted h-44 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">Selvedge spijkerjas</div>
                      <div className="text-sm font-medium">€189,00</div>
                    </div>
                    {scarcityUrgency && (
                      <div className="text-xs font-medium text-amber-600">
                        ⚡ Nog maar enkele beschikbaar — wacht niet te lang!
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {customMessage}
                    </p>
                    <button
                      type="button"
                      className="w-full rounded-md py-2.5 text-sm font-semibold text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      Shop nu
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {tab === "waitlist" && (
          <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op e-mail of product…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="Pending">In afwachting</SelectItem>
                <SelectItem value="Notified">Geïnformeerd</SelectItem>
                <SelectItem value="Purchased">Gekocht</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SectionCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">E-mailadres</TableHead>
                  <TableHead>Productnaam</TableHead>
                  <TableHead>Aanvraagdatum</TableHead>
                  <TableHead className="text-right pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Geen aanmeldingen gevonden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWaitlist.map((w, i) => (
                    <TableRow key={`${w.email}-${i}`}>
                      <TableCell className="pl-4 font-medium">{w.email}</TableCell>
                      <TableCell>{w.product}</TableCell>
                      <TableCell className="text-muted-foreground">{w.date}</TableCell>
                      <TableCell className="text-right pr-4">
                        <StatusBadge status={w.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClassName,
  badge,
  badgeTone,
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  badge?: string;
  badgeTone?: "success";
  icon?: React.ReactNode;
}) {
  return (
    <SectionCard className="p-5">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-3 flex-wrap">
        <div className={`text-3xl font-bold tracking-tight ${valueClassName ?? ""}`}>
          {value}
        </div>
        {badge && (
          <span
            className={
              badgeTone === "success"
                ? "text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                : "text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            }
          >
            {badge}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

function StatusBadge({ status }: { status: "Pending" | "Notified" | "Purchased" }) {
  const styles =
    status === "Purchased"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Notified"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
  const label =
    status === "Purchased" ? "Gekocht" : status === "Notified" ? "Geïnformeerd" : "In afwachting";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>
      {label}
    </span>
  );
}