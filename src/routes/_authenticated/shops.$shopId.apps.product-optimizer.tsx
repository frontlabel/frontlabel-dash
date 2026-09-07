import { createFileRoute, Link , useNavigate} from "@tanstack/react-router";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { SectionCard, SectionLabel } from "@/components/section-card";

import { useDisableAppGuard } from "@/components/disable-app-dialog";
import { useShellHeader } from "@/components/shell-header-context";
import { cn } from "@/lib/utils";
import {
  listOptimizableProducts,
  getOptimizableProduct,
  generateProductSuggestions,
  generateProductImage,
  deleteGeneratedImage,
  syncProductToShop,
  getSpecLibrary,
  getProductSpecs,
  renameSpecification,
  deleteSpecification,
} from "@/lib/product-optimizer.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronRight,
  CloudUpload,
  Copy,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
  ListChecks,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/shops/$shopId/apps/product-optimizer")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] as string } : {},
  component: ProductOptimizerPage,
});

const APP_SLUG = "product-optimizer";

interface OptimizerSettings {
  tone: string;
  language: string;
  audience: string;
  brandName: string;
  descriptionLength: string;
  specsAsTable: boolean;
}

const DEFAULTS: OptimizerSettings = {
  tone: "zakelijk",
  language: "Nederlands",
  audience: "",
  brandName: "",
  descriptionLength: "normaal",
  specsAsTable: true,
};

interface ProductRow {
  id: string;
  title: string;
  fulltitle: string;
  description: string;
  content: string;
  brand: string | null;
  price: number | null;
  image: string | null;
  imageCount: number;
  url: string | null;
  visible: boolean;
  score: number;
  missing: string[];
}

interface Suggestions {
  title: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  specs: { label: string; value: string }[];
  altTexts: string[];
  tips: string[];
}

interface SpecAttr {
  id: string;
  title: string;
  defaultValue: string;
  typeIds: string[];
}

/** Vergelijkingssleutel voor specificatienamen (hoofdletters/spaties negeren). */
function normalizeKey(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function scoreTone(score: number) {
  if (score >= 80) return { text: "text-green-700", bg: "bg-green-500", label: "Compleet" };
  if (score >= 50) return { text: "text-amber-700", bg: "bg-amber-500", label: "Kan beter" };
  return { text: "text-red-700", bg: "bg-red-500", label: "Onvolledig" };
}

function stripHtml(html: string) {
  return String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Maakt een bewaard voorstel veilig bruikbaar, ook als velden ontbreken. */
function normalizeSuggestions(raw: unknown): Suggestions | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<Suggestions>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    title: text(s.title),
    description: text(s.description),
    seoTitle: text(s.seoTitle),
    metaDescription: text(s.metaDescription),
    specs: Array.isArray(s.specs)
      ? s.specs
          .filter((x): x is { label: string; value: string } => !!x && typeof x === "object")
          .map((x) => ({ label: text(x.label), value: text(x.value) }))
          .filter((x) => x.label || x.value)
      : [],
    altTexts: Array.isArray(s.altTexts) ? s.altTexts.map(text).filter(Boolean) : [],
    tips: Array.isArray(s.tips) ? s.tips.map(text).filter(Boolean) : [],
  };
}


function ProductOptimizerPage() {
  const { shopId } = Route.useParams();
  const { setContent } = useShellHeader();
  const [active, setActive] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<OptimizerSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const tabSearch = Route.useSearch();
  const tabNav = useNavigate();
  const tab = (tabSearch.tab ?? "products") as "products" | "detail" | "specs" | "images" | "settings";
  const setTab = (t: "products" | "detail" | "specs" | "images" | "settings") =>
    tabNav({ to: ".", search: { tab: t }, replace: true });

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listReason, setListReason] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    product: ProductRow | null;
    images: { id: string; src: string; title: string; stagedPath?: string }[];
    generated: { url: string; path: string }[];
  }>({ product: null, images: [], generated: [] });
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageStyle, setImageStyle] = useState<"studio" | "sfeer" | "lifestyle">("studio");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageBusyPath, setImageBusyPath] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);
  const [pushDirty, setPushDirty] = useState(false);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [library, setLibrary] = useState<SpecAttr[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [productSpecs, setProductSpecs] = useState<{ label: string; value: string }[]>([]);
  const [allowNewSpecs, setAllowNewSpecs] = useState(false);

  const { requestToggle, dialog: disableDialog } = useDisableAppGuard({
    appName: "Product optimizer",
    appSlug: APP_SLUG,
    active,
    setActive,
  });

  const fetchList = useServerFn(listOptimizableProducts);
  const fetchDetail = useServerFn(getOptimizableProduct);
  const runSuggestions = useServerFn(generateProductSuggestions);
  const runImage = useServerFn(generateProductImage);
  const runDeleteImage = useServerFn(deleteGeneratedImage);
  const runSync = useServerFn(syncProductToShop);
  const runLibrary = useServerFn(getSpecLibrary);
  const runProductSpecs = useServerFn(getProductSpecs);
  const runRenameSpec = useServerFn(renameSpecification);
  const runDeleteSpec = useServerFn(deleteSpecification);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const res = await runLibrary({ data: { shopId } });
      if (res.ok) setLibrary(res.attributes as SpecAttr[]);
      else setLibraryError(res.error);
    } catch {
      setLibraryError("De specificaties konden niet opgehaald worden.");
    } finally {
      setLibraryLoading(false);
    }
  }, [runLibrary, shopId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  function update<K extends keyof OptimizerSettings>(k: K, v: OptimizerSettings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  const save = useCallback(async () => {
    setSaving(true);
    if (rowId) {
      const { error } = await supabase
        .from("shop_apps")
        .update({ enabled: active, settings: settings as unknown as Json })
        .eq("id", rowId);
      if (error) toast.error(error.message);
      else toast.success("Opgeslagen");
    } else {
      const { data, error } = await supabase
        .from("shop_apps")
        .insert({ shop_id: shopId, app_slug: APP_SLUG, enabled: active, settings: settings as unknown as Json })
        .select("id")
        .single();
      if (error) toast.error(error.message);
      else {
        setRowId(data!.id);
        toast.success("Opgeslagen");
      }
    }
    setSaving(false);
  }, [active, rowId, settings, shopId]);

  useEffect(() => {
    supabase
      .from("shop_apps")
      .select("id,enabled,settings")
      .eq("shop_id", shopId)
      .eq("app_slug", APP_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRowId(data.id);
        setActive(data.enabled);
        setSettings({ ...DEFAULTS, ...((data.settings as Partial<OptimizerSettings>) ?? {}) });
      });
  }, [shopId]);

  const loadProducts = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchList({ data: { shopId } });
      setProducts(res.products as ProductRow[]);
      setListReason(res.reason);
    } catch {
      setListReason("error");
    }
    setLoadingList(false);
  }, [fetchList, shopId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openProduct = useCallback(
    async (productId: string) => {
      setSelectedId(productId);
      setTab("detail");
      setSuggestions(null);
      setPushDirty(false);
      setImagesDirty(false);
      setDetail({ product: null, images: [], generated: [] });
      try {
        const res = await fetchDetail({ data: { shopId, productId } });
        setDetail({
          product: (res.product as ProductRow | null) ?? null,
          images: Array.isArray(res.images) ? res.images : [],
          generated: (res.saved?.imageUrls ?? []).map((url, i) => ({
            url,
            path: res.saved?.imagePaths?.[i] ?? "",
          })),
        });
        setSuggestions(normalizeSuggestions(res.saved?.suggestions));
        try {
          const own = await runProductSpecs({ data: { shopId, productId } });
          setProductSpecs(
            own.ok
              ? own.specs.map((sp) => ({ label: sp.label, value: sp.value })).filter((sp) => sp.label)
              : [],
          );
        } catch {
          setProductSpecs([]);
        }
      } catch (e) {
        console.error("[product-optimizer] detail failed", e);
        toast.error("Dit product kon niet geladen worden. Probeer het opnieuw.");
        setDetail({ product: null, images: [], generated: [] });
      }
    },
    [fetchDetail, runProductSpecs, shopId],
  );


  async function generate() {
    if (!selectedId) return;
    setGenerating(true);
    const res = await runSuggestions({
      data: {
        shopId,
        productId: selectedId,
        settings: {
          tone: settings.tone,
          language: settings.language,
          audience: settings.audience,
          brandName: settings.brandName,
          descriptionLength: settings.descriptionLength,
        },
      },
    });
    if (res.ok) {
      setSuggestions(normalizeSuggestions(res.suggestions));
      setPushDirty(true);
      toast.success("Voorstel klaar");
    } else {
      toast.error(res.error);
    }
    setGenerating(false);
  }

  async function makeImage() {
    if (!selectedId) return;
    setGeneratingImage(true);
    const toastId = toast.loading("Afbeelding wordt gemaakt… dit duurt ongeveer een halve minuut.");
    try {
      const res = await runImage({
        data: { shopId, productId: selectedId, style: imageStyle, prompt: imagePrompt },
      });
      if (res.ok && res.url) {
        setDetail((d) => ({ ...d, generated: [...d.generated, { url: res.url, path: res.path }] }));
        toast.success("Afbeelding gemaakt", { id: toastId });
      } else {
        toast.error(res.ok ? "De afbeelding kon niet opgehaald worden." : res.error, { id: toastId });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Er ging iets mis.", { id: toastId });
    } finally {
      setGeneratingImage(false);
    }
  }

  async function deleteImage(path: string) {
    if (!selectedId || !path) return;
    setImageBusyPath(path);
    try {
      const res = await runDeleteImage({ data: { shopId, productId: selectedId, path } });
      if (res.ok) {
        setDetail((d) => ({ ...d, generated: d.generated.filter((g) => g.path !== path) }));
        toast.success("Afbeelding verwijderd");
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setImageBusyPath(null);
    }
  }

  /** Zet een gegenereerde afbeelding lokaal in de volgorde; upload gebeurt bij "Push naar shop". */
  function addImageToProduct(path: string) {
    if (!selectedId || !path) return;
    setDetail((d) => {
      const gen = d.generated.find((g) => g.path === path);
      if (!gen) return d;
      return {
        ...d,
        generated: d.generated.filter((g) => g.path !== path),
        images: [
          ...d.images,
          {
            id: `staged:${path}`,
            src: gen.url,
            title: suggestions?.title || d.product?.title || "",
            stagedPath: path,
          },
        ],
      };
    });
    setPushDirty(true);
    setImagesDirty(true);
    toast.success("Toegevoegd aan de afbeeldingen — klik op “Push naar shop” om hem naar je shop te sturen.");
  }

  /** Haalt een gestagete afbeelding terug naar de gegenereerde lijst. */
  function unstageImage(path: string) {
    setDetail((d) => {
      const img = d.images.find((i) => i.stagedPath === path);
      if (!img) return d;
      return {
        ...d,
        images: d.images.filter((i) => i.stagedPath !== path),
        generated: [...d.generated, { url: img.src, path }],
      };
    });
  }

  /** Wijzigt lokaal de volgorde van de productafbeeldingen; push gebeurt bij "Push naar shop". */
  function moveShopImage(from: number, to: number) {
    if (from === to) return;
    setDetail((d) => {
      const next = [...d.images];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { ...d, images: next };
    });
    setPushDirty(true);
    setImagesDirty(true);
  }

  function reorderGenerated(from: number, to: number) {
    if (from === to) return;
    setDetail((d) => {
      const next = [...d.generated];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { ...d, generated: next };
    });
  }

  async function syncToShop() {
    if (!selectedId || !suggestions) return;
    setConfirmSync(false);
    setSyncing(true);
    const res = await runSync({
      data: {
        shopId,
        productId: selectedId,
        fields: {
          title: suggestions.title,
          seoTitle: suggestions.seoTitle,
          metaDescription: suggestions.metaDescription,
          description: suggestions.description,
        },
        altTexts: suggestions.altTexts,
        imageOrder: imagesDirty
          ? detail.images.map((i) => (i.stagedPath ? `staged:${i.stagedPath}` : i.id))
          : [],
        specs: suggestions.specs
          .filter((sp) => sp.label && sp.value)
          .map((sp) => ({
            attributeId:
              library.find((a) => normalizeKey(a.title) === normalizeKey(sp.label))?.id ?? null,
            label: sp.label,
            value: sp.value,
          })),
        allowNewSpecs,
      },
    });
    if (res.ok) {
      const parts: string[] = [];
      if (res.altUpdated > 0) parts.push(`${res.altUpdated} alt-teksten`);
      if (res.imagesUploaded > 0) parts.push(`${res.imagesUploaded} nieuwe afbeeldingen`);
      if (res.orderUpdated > 0) parts.push("afbeeldingsvolgorde");
      if (res.specsUpdated > 0) parts.push(`${res.specsUpdated} specificaties`);
      if (res.specsSkipped.length > 0) {
        toast.warning(
          `Niet doorgezet: ${res.specsSkipped.join(", ")}. Deze specificaties bestaan nog niet in je shop of het product heeft geen specificatiegroep.`,
        );
      }
      toast.success(
        parts.length
          ? `Gesynchroniseerd naar je shop (${parts.join(", ")} bijgewerkt)`
          : "Gesynchroniseerd naar je shop",
      );
      if (res.imageError) toast.error(res.imageError);
      setPushDirty(false);
      setImagesDirty(false);
      await openProduct(selectedId);
    } else {
      toast.error(res.error);
    }
    setSyncing(false);
  }


  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
          <Link to="/shops/$shopId/apps" params={{ shopId }} className="text-foreground hover:underline truncate">
            Apps
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate">Product optimizer</span>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="app-active" checked={active} onCheckedChange={requestToggle} />
            <Label htmlFor="app-active" className="cursor-pointer">
              {active ? "Actief" : "Uit"}
            </Label>
          </div>
        </div>
      </div>,
    );
    return () => setContent(null);
  }, [shopId, active, saving, setContent, requestToggle, save]);

  const tabs = [
    { id: "products" as const, label: "Producten" },
    { id: "detail" as const, label: "Product detail" },
    { id: "specs" as const, label: "Specificaties" },
    { id: "images" as const, label: "Afbeeldingen" },
    { id: "settings" as const, label: "Instellingen" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Product optimizer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zie in één oogopslag hoe compleet je producten gevuld zijn en laat AI betere teksten, SEO,
          specificaties en afbeeldingen voorstellen.
        </p>
      </div>

      <div className="px-6 mt-4 border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        {tab === "products" && (
          <ProductsTab
            products={products}
            loading={loadingList}
            reason={listReason}
            shopId={shopId}
            onRefresh={loadProducts}
            onOpen={openProduct}
          />
        )}
        {tab === "detail" && (
          <DetailTab
            product={detail.product}
            images={detail.images}
            suggestions={suggestions}
            generating={generating}
            onGenerate={generate}
            hasSelection={!!selectedId}
            specsAsTable={settings.specsAsTable}
            onEdit={(patch) => {
              setSuggestions((prev) => (prev ? { ...prev, ...patch } : prev));
              setPushDirty(true);
            }}
          />
        )}
        {tab === "specs" && (
          <SpecsTab
            library={library}
            loading={libraryLoading}
            error={libraryError}
            onRefresh={loadLibrary}
            onRename={async (attributeId, title) => {
              const res = await runRenameSpec({ data: { shopId, attributeId, title } });
              if (res.ok) {
                toast.success("Specificatie hernoemd");
                loadLibrary();
              } else toast.error(res.error);
            }}
            onDelete={async (attributeId) => {
              const res = await runDeleteSpec({ data: { shopId, attributeId } });
              if (res.ok) {
                toast.success("Specificatie verwijderd");
                loadLibrary();
              } else toast.error(res.error);
            }}
            suggested={suggestions?.specs ?? []}
            productSpecs={productSpecs}
            allowNew={allowNewSpecs}
            setAllowNew={setAllowNewSpecs}
            productTitle={detail.product?.title ?? ""}
          />
        )}
        {tab === "images" && (
          <ImagesTab
            product={detail.product}
            images={detail.images}
            generated={detail.generated}
            style={imageStyle}
            setStyle={setImageStyle}
            prompt={imagePrompt}
            setPrompt={setImagePrompt}
            busy={generatingImage}
            busyPath={imageBusyPath}
            onGenerate={makeImage}
            onDelete={deleteImage}
            onAddToProduct={addImageToProduct}
            onUnstage={unstageImage}
            onMoveImage={moveShopImage}
            onReorderGenerated={reorderGenerated}
            hasSelection={!!selectedId}
          />
        )}
        {tab === "settings" && <SettingsTab settings={settings} update={update} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/90 px-6 py-3 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button
            onClick={() => setConfirmSync(true)}
            disabled={!pushDirty || !suggestions || !selectedId || syncing || generating}
            variant="outline"
            className="rounded-lg py-3 h-auto"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            {syncing ? "Pushen…" : "Push naar shop"}
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-lg py-3 h-auto">
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>
      {disableDialog}

      <AlertDialog open={confirmSync} onOpenChange={setConfirmSync}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voorstel naar je shop pushen?</AlertDialogTitle>
            <AlertDialogDescription>
              De huidige titel, SEO-titel, meta description en omschrijving van dit product in je
              webshop worden overschreven door het voorstel. Alt-teksten van bestaande afbeeldingen
              worden bijgewerkt, nieuw toegevoegde afbeeldingen worden geüpload en de aangepaste
              volgorde van de afbeeldingen wordt toegepast. Dit kun je niet ongedaan maken.

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="py-3 h-auto">Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={syncToShop} className="py-3 h-auto">
              <CloudUpload className="h-4 w-4" />
              Push naar shop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
        <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>{score}</span>
    </div>
  );
}

function ProductsTab({
  products,
  loading,
  reason,
  shopId,
  onRefresh,
  onOpen,
}: {
  products: ProductRow[];
  loading: boolean;
  reason: string;
  shopId: string;
  onRefresh: () => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (q ? p.title.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q) : true))
      .filter((p) => (onlyIncomplete ? p.score < 80 : true))
      .sort((a, b) => a.score - b.score);
  }, [products, query, onlyIncomplete]);

  const average = products.length
    ? Math.round(products.reduce((sum, p) => sum + p.score, 0) / products.length)
    : 0;
  const needsWork = products.filter((p) => p.score < 80).length;

  if (reason === "no-credentials") {
    return (
      <SectionCard className="p-6 text-sm">
        <p className="font-medium">Nog geen actieve koppeling met je shop</p>
        <p className="text-muted-foreground mt-1">
          Koppel je shop opnieuw om je producten hier te kunnen inladen.
        </p>
        <Button asChild className="mt-4 py-3 h-auto">
          <Link to="/shops/$shopId" params={{ shopId }}>Naar de shoppagina</Link>
        </Button>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SectionCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Gemiddelde score</div>
          <div className="mt-2 text-2xl font-semibold">{average}</div>
        </SectionCard>
        <SectionCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Producten</div>
          <div className="mt-2 text-2xl font-semibold">{products.length}</div>
        </SectionCard>
        <SectionCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Aandacht nodig</div>
          <div className="mt-2 text-2xl font-semibold">{needsWork}</div>
        </SectionCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek producten…"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={onlyIncomplete} onCheckedChange={setOnlyIncomplete} />
          Alleen onvolledig
        </label>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="py-3 h-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Vernieuwen
        </Button>
      </div>

      <SectionCard>
        {loading && products.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Producten laden…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Geen producten gevonden.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Merk</th>
                
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Prijs</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.title}
                          className="h-10 w-10 rounded border border-border object-contain bg-white shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => onOpen(p.id)}
                        className="font-medium text-primary hover:underline truncate text-left"
                      >
                        {p.title || "Zonder titel"}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{p.brand ?? "—"}</td>
                  <td className="px-5 py-3 hidden sm:table-cell tabular-nums">
                    {p.price !== null ? money.format(p.price) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="group relative">
                      <ScoreBar score={p.score} />
                      {p.missing.length > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden w-max max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block z-20">
                          <p className="font-semibold mb-1 text-gray-100">Wat ontbreekt</p>
                          <p className="text-gray-200">{p.missing.join(" · ")}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => onOpen(p.id)} className="py-3 h-auto">
                      Optimaliseer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

function CopyBlock({
  label,
  value,
  html,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  html?: boolean;
  onChange?: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Gekopieerd");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Kopieer
        </Button>
      </div>
      {onChange ? (
        <>
          <Textarea
            value={value}
            rows={rows ?? (html ? 10 : 2)}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white text-sm"
          />
          {html && value.trim() !== "" && (
            <div
              className="prose prose-sm max-w-none mt-2 rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          )}
        </>
      ) : html ? (
        <div
          className="prose prose-sm max-w-none rounded-md border border-border bg-white p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <p className="rounded-md border border-border bg-white p-3 text-sm whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}


function DetailTab({
  product,
  images,
  suggestions,
  generating,
  onGenerate,
  hasSelection,
  specsAsTable,
  onEdit,
}: {
  product: ProductRow | null;
  images: { id: string; src: string; title: string }[];
  suggestions: Suggestions | null;
  generating: boolean;
  onGenerate: () => void;
  hasSelection: boolean;
  specsAsTable: boolean;
  onEdit: (patch: Partial<Suggestions>) => void;
}) {
  if (!hasSelection) {
    return (
      <SectionCard className="p-8 text-center text-sm text-muted-foreground">
        Kies eerst een product in het tabblad <span className="font-medium text-foreground">Producten</span>.
      </SectionCard>
    );
  }
  if (!product) {
    return <SectionCard className="p-8 text-center text-sm text-muted-foreground">Product laden…</SectionCard>;
  }

  return (
    <div className="space-y-6">
      <SectionCard className="p-5 flex flex-wrap items-center gap-4">
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            className="h-16 w-16 rounded border border-border object-contain bg-white"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{product.title}</div>
          <div className="text-xs text-muted-foreground">
            {product.brand ?? "Geen merk"} · {images.length} afbeelding(en)
          </div>
        </div>
        <ScoreBar score={product.score} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={onGenerate} disabled={generating} variant={suggestions ? "outline" : "default"} className="py-3 h-auto">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggestions ? "Genereer opnieuw" : "Genereer voorstel"}
          </Button>
        </div>
      </SectionCard>

      {product.missing.length > 0 && (
        <div>
          <SectionLabel>Wat ontbreekt nog</SectionLabel>
          <SectionCard className="p-5">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {product.missing.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionLabel>Nu in je shop</SectionLabel>
          <SectionCard className="p-5 space-y-4">
            <Field label="Titel" value={product.title} />
            <Field label="Lange titel" value={product.fulltitle} />
            <Field label="Meta description" value={product.description} />
            <Field label="Omschrijving" value={stripHtml(product.content).slice(0, 1200)} />
          </SectionCard>
        </div>

        <div>
          <SectionLabel>Voorstel</SectionLabel>
          <SectionCard className="p-5 space-y-5">
            {!suggestions ? (
              <p className="text-sm text-muted-foreground">
                Nog geen voorstel. Klik op <span className="font-medium text-foreground">Genereer voorstel</span>.
              </p>
            ) : (
              <>
                <CopyBlock
                  label="Titel"
                  value={suggestions.title}
                  onChange={(v) => onEdit({ title: v })}
                  rows={2}
                />
                <CopyBlock
                  label="SEO-titel"
                  value={suggestions.seoTitle}
                  onChange={(v) => onEdit({ seoTitle: v })}
                  rows={2}
                />
                <CopyBlock
                  label="Meta description"
                  value={suggestions.metaDescription}
                  onChange={(v) => onEdit({ metaDescription: v })}
                  rows={3}
                />
                <CopyBlock
                  label="Omschrijving"
                  value={suggestions.description}
                  html
                  onChange={(v) => onEdit({ description: v })}
                  rows={12}
                />
                {suggestions.specs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specificaties</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          const text = specsAsTable
                            ? `<table>${suggestions.specs
                                .map((s) => `<tr><td>${s.label}</td><td>${s.value}</td></tr>`)
                                .join("")}</table>`
                            : suggestions.specs.map((s) => `${s.label}: ${s.value}`).join("\n");
                          navigator.clipboard.writeText(text);
                          toast.success("Gekopieerd");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Kopieer
                      </Button>
                    </div>
                    <div className="rounded-md border border-border bg-white divide-y divide-border text-sm">
                      {suggestions.specs.map((s, i) => (
                        <div key={`${s.label}-${i}`} className="flex items-center gap-3 px-3 py-2">
                          <span className="w-40 shrink-0 text-muted-foreground">{s.label}</span>
                          <Input
                            value={s.value}
                            onChange={(e) =>
                              onEdit({
                                specs: suggestions.specs.map((sp, j) =>
                                  j === i ? { ...sp, value: e.target.value } : sp,
                                ),
                              })
                            }
                            className="h-8 flex-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {suggestions.altTexts.length > 0 && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Alt-teksten</Label>
                    <div className="mt-1.5 space-y-2">
                      {suggestions.altTexts.map((alt, i) => (
                        <div key={`alt-${i}`} className="flex items-center gap-3">
                          {images[i]?.src ? (
                            <img
                              src={images[i]!.src}
                              alt=""
                              className="h-10 w-10 rounded border border-border object-contain bg-white shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border border-border bg-muted shrink-0" />
                          )}
                          <Input
                            value={alt}
                            onChange={(e) =>
                              onEdit({
                                altTexts: suggestions.altTexts.map((a, j) => (j === i ? e.target.value : a)),
                              })
                            }
                            className="h-8 flex-1 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(alt);
                              toast.success("Gekopieerd");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {suggestions.tips.length > 0 && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tips</Label>
                    <ul className="mt-1.5 space-y-1.5 text-sm text-muted-foreground">
                      {suggestions.tips.map((t) => (
                        <li key={t} className="flex gap-2">
                          <span className="text-primary">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm whitespace-pre-wrap">
        {value ? value : <span className="text-muted-foreground italic">Niet ingevuld</span>}
      </p>
    </div>
  );
}

function ImagesTab({
  product,
  images,
  generated,
  style,
  setStyle,
  prompt,
  setPrompt,
  busy,
  busyPath,
  onGenerate,
  onDelete,
  onAddToProduct,
  onUnstage,
  onMoveImage,
  onReorderGenerated,
  hasSelection,
}: {
  product: ProductRow | null;
  images: { id: string; src: string; title: string; stagedPath?: string }[];
  generated: { url: string; path: string }[];
  style: "studio" | "sfeer" | "lifestyle";
  setStyle: (v: "studio" | "sfeer" | "lifestyle") => void;
  prompt: string;
  setPrompt: (v: string) => void;
  busy: boolean;
  busyPath: string | null;
  onGenerate: () => void;
  onDelete: (path: string) => void;
  onAddToProduct: (path: string) => void;
  onUnstage: (path: string) => void;
  onMoveImage: (from: number, to: number) => void;
  onReorderGenerated: (from: number, to: number) => void;
  hasSelection: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragGenIdx = useRef<number | null>(null);

  if (!hasSelection || !product) {
    return (
      <SectionCard className="p-8 text-center text-sm text-muted-foreground">
        Kies eerst een product in het tabblad <span className="font-medium text-foreground">Producten</span>.
      </SectionCard>
    );
  }

  const styles: { id: "studio" | "sfeer" | "lifestyle"; label: string; description: string }[] = [
    { id: "studio", label: "Witte achtergrond", description: "Strakke studiofoto op wit." },
    { id: "sfeer", label: "Sfeerbeeld", description: "Natuurlijk licht en warme omgeving." },
    { id: "lifestyle", label: "Lifestyle", description: "Product in gebruik in een interieur." },
  ];

  return (
    <div className="space-y-6">
      {(images.length < 3 || images.some((i) => !i.title)) && (
        <SectionCard className="p-5 text-sm">
          <p className="font-medium">Aandachtspunten</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {images.length < 3 && <li>• Dit product heeft minder dan 3 afbeeldingen.</li>}
            {images.some((i) => !i.title) && <li>• Eén of meer afbeeldingen missen een alt-tekst.</li>}
          </ul>
        </SectionCard>
      )}

      <div>
        <SectionLabel>Huidige afbeeldingen</SectionLabel>
        <SectionCard className="p-5 space-y-4">
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">Dit product heeft nog geen afbeeldingen.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Sleep een afbeelding om de volgorde aan te passen. De eerste afbeelding is de
                hoofdafbeelding van het product. Wijzigingen worden meegestuurd bij “Push naar
                shop”.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx !== null) onMoveImage(dragIdx, i);
                      setDragIdx(null);
                    }}
                    onDragEnd={() => setDragIdx(null)}
                    className={cn(
                      "rounded-md transition-opacity",
                      dragIdx === i && "opacity-40",
                    )}
                  >
                    <div className="relative group cursor-grab active:cursor-grabbing">
                      <img
                        src={img.src}
                        alt={img.title || product.title}
                        className="aspect-square w-full rounded-md border border-border object-contain bg-white pointer-events-none"
                        loading="lazy"
                      />
                      <div className="absolute left-1.5 top-1.5 rounded bg-white/90 p-1 text-muted-foreground shadow-sm">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <div className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
                        {i + 1}
                      </div>
                      {img.stagedPath && (
                        <>
                          <div className="absolute left-1.5 bottom-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                            Nieuw
                          </div>
                          <button
                            type="button"
                            title="Terugzetten naar gegenereerde afbeeldingen"
                            onClick={() => onUnstage(img.stagedPath!)}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-gray-500 shadow-md hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground truncate">
                      {img.title || "Geen alt-tekst"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Nieuwe afbeelding genereren</SectionLabel>
        <SectionCard className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  style === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-gray-50",
                )}
              >
                <div className="text-sm font-medium">{s.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-prompt">Extra wensen voor de afbeelding</Label>
            <Textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Bijvoorbeeld: product schuin van voren, lichtgrijze achtergrond, houten vloer, geen rekwisieten."
            />
            <p className="text-xs text-muted-foreground">
              Beschrijf hoe de afbeelding eruit moet zien. Laat leeg voor een standaard productfoto.
            </p>
          </div>

          <Button onClick={onGenerate} disabled={busy} className="py-3 h-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Bezig…" : "Genereer afbeelding"}
          </Button>

          {generated.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Sleep om de volgorde te bepalen; in deze volgorde worden ze bij "Push naar shop"
                toegevoegd.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {generated.map((img, i) => {
                  const rowBusy = busyPath === img.path;
                  return (
                    <div
                      key={img.path || img.url}
                      draggable={!rowBusy}
                      onDragStart={() => {
                        dragGenIdx.current = i;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragGenIdx.current !== null) onReorderGenerated(dragGenIdx.current, i);
                        dragGenIdx.current = null;
                      }}
                      onDragEnd={() => {
                        dragGenIdx.current = null;
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <div className="relative">
                        <img
                          src={img.url}
                          alt={`Gegenereerde afbeelding ${i + 1} van ${product.title}`}
                          className="aspect-square w-full rounded-md border border-border object-cover bg-white pointer-events-none"
                          loading="lazy"
                        />
                        <div className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
                          {i + 1}
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 h-auto"
                          disabled={rowBusy || !img.path}
                          onClick={() => onAddToProduct(img.path)}
                        >
                          {rowBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CloudUpload className="h-4 w-4" />
                          )}
                          Toevoegen aan product
                        </Button>
                        <div className="flex items-center justify-between">
                          <a
                            href={img.url}
                            download
                            className="text-xs text-primary hover:underline"
                          >
                            Downloaden
                          </a>
                          <button
                            type="button"
                            onClick={() => onDelete(img.path)}
                            disabled={rowBusy || !img.path}
                            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function SettingsTab({
  settings,
  update,
}: {
  settings: OptimizerSettings;
  update: <K extends keyof OptimizerSettings>(k: K, v: OptimizerSettings[K]) => void;
}) {
  const tones = ["zakelijk", "enthousiast", "informatief"];
  const lengths = ["kort", "normaal", "uitgebreid"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <SectionLabel>Schrijfstijl</SectionLabel>
        <SectionCard className="p-5 space-y-5">
          <div className="space-y-2">
            <Label>Tone of voice</Label>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t}
                  onClick={() => update("tone", t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm capitalize transition-colors",
                    settings.tone === t ? "border-primary bg-primary/5" : "border-border hover:bg-gray-50",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Taal</Label>
            <Input id="language" value={settings.language} onChange={(e) => update("language", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Doelgroep</Label>
            <Textarea
              id="audience"
              rows={3}
              placeholder="Bijv. doe-het-zelvers die kwaliteit belangrijker vinden dan prijs"
              value={settings.audience}
              onChange={(e) => update("audience", e.target.value)}
            />
          </div>
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Merk &amp; opmaak</SectionLabel>
        <SectionCard className="p-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="brandName">Merknaam</Label>
            <Input id="brandName" value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lengte omschrijving</Label>
            <div className="flex flex-wrap gap-2">
              {lengths.map((l) => (
                <button
                  key={l}
                  onClick={() => update("descriptionLength", l)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm capitalize transition-colors",
                    settings.descriptionLength === l
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-gray-50",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="specsAsTable">Specificaties als tabel kopiëren</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Uit: specificaties worden als eenvoudige lijst gekopieerd.
              </p>
            </div>
            <Switch
              id="specsAsTable"
              checked={settings.specsAsTable}
              onCheckedChange={(v) => update("specsAsTable", v)}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Specificaties                                                       */
/* ------------------------------------------------------------------ */

function SpecsTab({
  library,
  loading,
  error,
  onRefresh,
  onRename,
  onDelete,
  suggested,
  productSpecs,
  allowNew,
  setAllowNew,
  productTitle,
}: {
  library: SpecAttr[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onRename: (attributeId: string, title: string) => void;
  onDelete: (attributeId: string) => void;
  suggested: { label: string; value: string }[];
  productSpecs: { label: string; value: string }[];
  allowNew: boolean;
  setAllowNew: (v: boolean) => void;
  productTitle: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...library]
      .sort((a, b) => a.title.localeCompare(b.title, "nl"))
      .filter((a) => !q || a.title.toLowerCase().includes(q));
  }, [library, query]);

  // Bijna-identieke namen groeperen zodat dubbelingen en typo's opvallen.
  const duplicates = useMemo(() => {
    const groups = new Map<string, SpecAttr[]>();
    for (const a of library) {
      const key = normalizeKey(a.title);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  }, [library]);

  const known = useMemo(() => new Set(library.map((a) => normalizeKey(a.title))), [library]);
  const newOnes = suggested.filter((s) => s.label && !known.has(normalizeKey(s.label)));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <SectionLabel>Specificaties in je shop</SectionLabel>
        <SectionCard className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Dit is de vaste lijst met specificatienamen van je shop. Voorstellen kiezen alleen uit
            deze lijst, zodat er geen dubbele of verkeerd gespelde specificaties bijkomen.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek specificatie"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={onRefresh} disabled={loading} className="py-3 h-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Vernieuwen
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900">
                {duplicates.length} mogelijke dubbele specificatie
                {duplicates.length === 1 ? "" : "s"} gevonden
              </p>
              <ul className="mt-1 list-disc pl-5 text-amber-900/80">
                {duplicates.slice(0, 6).map((g) => (
                  <li key={g[0]!.id}>{g.map((a) => a.title).join(" / ")}</li>
                ))}
              </ul>
              <p className="mt-1 text-amber-900/70">
                Hernoem de juiste schrijfwijze en verwijder de rest.
              </p>
            </div>
          )}

          {!loading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen specificaties gevonden.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-white text-sm">
              {filtered.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                  {editing === a.id ? (
                    <>
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="h-9 flex-1"
                      />
                      <Button
                        size="sm"
                        className="py-2 h-auto"
                        onClick={() => {
                          onRename(a.id, draft.trim() || a.title);
                          setEditing(null);
                        }}
                      >
                        Bewaren
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Annuleer
                      </Button>
                    </>
                  ) : (
                    <>
                      <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{a.title}</span>
                      {a.defaultValue && (
                        <span className="truncate text-xs text-muted-foreground">
                          standaard: {a.defaultValue}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {a.typeIds.length} groep{a.typeIds.length === 1 ? "" : "en"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setEditing(a.id);
                          setDraft(a.title);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-600"
                        onClick={() => onDelete(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Voor dit product</SectionLabel>
        <SectionCard className="p-5 space-y-4">
          {productTitle ? (
            <p className="text-sm font-medium">{productTitle}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kies eerst een product bij <span className="font-medium text-foreground">Producten</span>.
            </p>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Nu in je shop
            </Label>
            {productSpecs.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nog geen specificaties gevuld.</p>
            ) : (
              <div className="mt-1.5 divide-y divide-border rounded-md border border-border bg-white text-sm">
                {productSpecs.map((sp) => (
                  <div key={sp.label} className="flex gap-3 px-3 py-2">
                    <span className="w-36 shrink-0 text-muted-foreground">{sp.label}</span>
                    <span className="truncate">{sp.value || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Voorstel
            </Label>
            {suggested.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nog geen voorstel gemaakt.</p>
            ) : (
              <div className="mt-1.5 divide-y divide-border rounded-md border border-border bg-white text-sm">
                {suggested.map((sp) => {
                  const isNew = !known.has(normalizeKey(sp.label));
                  return (
                    <div key={sp.label} className="flex items-center gap-2 px-3 py-2">
                      <span className="w-32 shrink-0 text-muted-foreground truncate">{sp.label}</span>
                      <span className="flex-1 truncate">{sp.value}</span>
                      {isNew && (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                          nieuw
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {newOnes.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Switch id="allow-new-specs" checked={allowNew} onCheckedChange={setAllowNew} />
              <div>
                <Label htmlFor="allow-new-specs">Nieuwe specificaties toestaan</Label>
                <p className="text-xs text-muted-foreground">
                  Uit: {newOnes.length} onbekende specificatie
                  {newOnes.length === 1 ? "" : "s"} worden overgeslagen bij Push naar shop.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Bij <span className="font-medium text-foreground">Push naar shop</span> worden deze
            waarden in de echte specificatievelden van je shop gezet, niet in de omschrijving.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
