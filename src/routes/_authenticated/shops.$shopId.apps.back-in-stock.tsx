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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  Bell,
  ImageIcon,
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

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/shops/$shopId/apps" params={{ shopId }}>
            <ArrowLeft className="h-4 w-4" /> Back to Apps
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <Switch id="app-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="app-active" className="cursor-pointer">
            {active ? "App Active" : "App Inactive"}
          </Label>
        </div>
      </div>,
    );
    return () => setContent(null);
  }, [shopId, active, setContent]);

  // Widget design state
  const [buttonText, setButtonText] = useState("Notify me when available");
  const [buttonColor, setButtonColor] = useState("#111827");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  // Email config state
  const [emailSubject, setEmailSubject] = useState(
    "Good news — {product} is back in stock!",
  );
  const [brandColor, setBrandColor] = useState("#111827");
  const [customMessage, setCustomMessage] = useState(
    "Hi {name}, the item you were waiting for is available again. Grab it before it's gone!",
  );
  const [scarcityUrgency, setScarcityUrgency] = useState(true);

  // Waitlist state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const topProducts = useMemo(
    () => [
      { name: "Selvedge Denim Jacket", stock: 0, waitlist: 84, value: "€2,520" },
      { name: "Merino Crew Knit — Cream", stock: 0, waitlist: 61, value: "€1,830" },
      { name: "Suede Chelsea Boots", stock: 2, waitlist: 47, value: "€1,645" },
      { name: "Linen Overshirt — Olive", stock: 0, waitlist: 39, value: "€1,170" },
      { name: "Wool Beanie — Charcoal", stock: 0, waitlist: 28, value: "€420" },
    ],
    [],
  );

  const waitlist = useMemo(
    () => [
      { email: "anna.devries@example.com", product: "Selvedge Denim Jacket", date: "2026-06-12", status: "Pending" as const },
      { email: "lukas.b@example.com", product: "Merino Crew Knit — Cream", date: "2026-06-11", status: "Notified" as const },
      { email: "sophie.k@example.com", product: "Suede Chelsea Boots", date: "2026-06-10", status: "Purchased" as const },
      { email: "marc.j@example.com", product: "Linen Overshirt — Olive", date: "2026-06-09", status: "Pending" as const },
      { email: "emma.t@example.com", product: "Selvedge Denim Jacket", date: "2026-06-08", status: "Notified" as const },
      { email: "noah.p@example.com", product: "Wool Beanie — Charcoal", date: "2026-06-07", status: "Pending" as const },
      { email: "lisa.m@example.com", product: "Merino Crew Knit — Cream", date: "2026-06-06", status: "Purchased" as const },
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

  return (
    <div className="px-6 pt-6 pb-16 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Back in Stock Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turn out-of-stock products into recovered revenue.
        </p>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto w-full sm:w-auto">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="widget">Widget Design</TabsTrigger>
          <TabsTrigger value="email">Email Configuration</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist Management</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Recovered Revenue"
              value="€3,450"
              valueClassName="text-emerald-600"
              badge="+12% this month"
              badgeTone="success"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="Emails Sent"
              value="412"
              icon={<Mail className="h-4 w-4" />}
            />
            <MetricCard
              label="Conversion Rate"
              value="18.5%"
              icon={<Bell className="h-4 w-4" />}
            />
          </div>

          <div>
            <SectionLabel>Top Requested Products</SectionLabel>
            <SectionCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px] pl-4">Product</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Waitlist Size</TableHead>
                    <TableHead className="text-right pr-4">Potential Value</TableHead>
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
                          <Badge variant="destructive" className="text-xs">Out of stock</Badge>
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
        </TabsContent>

        {/* WIDGET DESIGN */}
        <TabsContent value="widget" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Settings</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="btnText">Button Text</Label>
                  <Input
                    id="btnText"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Color</Label>
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
                    Add Newsletter Opt-in checkbox to capture leads
                  </Label>
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionLabel>Live Preview</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-md border border-border bg-background p-5">
                  <div className="grid grid-cols-[120px_1fr] gap-4">
                    <div className="h-32 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Outerwear
                      </div>
                      <div className="font-semibold text-base leading-tight">
                        Selvedge Denim Jacket
                      </div>
                      <div className="text-sm font-medium">€189,00</div>
                      <Badge variant="destructive" className="text-xs">Out of stock</Badge>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: buttonColor }}
                    >
                      {buttonText || "Notify me when available"}
                    </button>
                    {newsletterOptIn && (
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" defaultChecked className="mt-0.5" />
                        <span>Yes, also send me occasional updates and offers.</span>
                      </label>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* EMAIL CONFIG */}
        <TabsContent value="email" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Settings</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
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
                  <Label>Brand Color</Label>
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
                  <Label htmlFor="msg">Custom Message</Label>
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
                      Add Scarcity Urgency
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Voegt regels toe als "Only a few left!" om conversie te verhogen.
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
              <SectionLabel>Preview</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                  <div
                    className="h-2"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div className="p-6 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Subject: <span className="text-foreground">{emailSubject}</span>
                    </div>
                    <div className="rounded-md bg-muted h-44 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">Selvedge Denim Jacket</div>
                      <div className="text-sm font-medium">€189,00</div>
                    </div>
                    {scarcityUrgency && (
                      <div className="text-xs font-medium text-amber-600">
                        ⚡ Only a few left — don't wait too long!
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
                      Shop now
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* WAITLIST */}
        <TabsContent value="waitlist" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or product…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Notified">Notified</SelectItem>
                <SelectItem value="Purchased">Purchased</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SectionCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Email Address</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Request Date</TableHead>
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
        </TabsContent>
      </Tabs>
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
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>
      {status}
    </span>
  );
}