import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shops/$shopId")({
  component: ShopLayout,
});

function ShopLayout() {
  const { shopId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [shopName, setShopName] = useState<string>("");

  useEffect(() => {
    supabase
      .from("shops")
      .select("name")
      .eq("id", shopId)
      .maybeSingle()
      .then(({ data }) => setShopName((data as { name: string } | null)?.name ?? ""));
  }, [shopId]);

  const tabs = [
    { to: `/shops/${shopId}`, label: "Connectie", exact: true },
    { to: `/shops/${shopId}/apps`, label: "Apps", exact: false },
  ];

  // Only show the shop title + Connectie/Apps tabs on the shop itself and
  // the apps list — not on individual app detail pages.
  const appsBase = `/shops/${shopId}/apps`;
  const onAppDetail =
    pathname.startsWith(appsBase + "/") && pathname.length > appsBase.length + 1;

  return (
    <div className="max-w-6xl mx-auto">
      {!onAppDetail && (
        <>
          <PageHeader title={shopName || "Shop"} />
          <div className="px-6 border-b border-border">
            <div className="flex gap-1">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
                return (
                  <a
                    key={t.to}
                    href={t.to}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", t.to);
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
      <Outlet />
    </div>
  );
}