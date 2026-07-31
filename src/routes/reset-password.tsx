import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nieuw wachtwoord instellen — Shoplabel" },
      { name: "description", content: "Stel een nieuw wachtwoord in voor je Shoplabel account." },
      { property: "og:title", content: "Nieuw wachtwoord instellen — Shoplabel" },
      { property: "og:description", content: "Stel een nieuw wachtwoord in voor je Shoplabel account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wachtwoord bijgewerkt.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
            S
          </div>
          <h1 className="mt-6 text-center text-2xl/9 font-bold tracking-tight text-foreground">
            Nieuw wachtwoord instellen
          </h1>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-card px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="new-password" className="block text-sm/6 font-medium text-foreground">
                  Nieuw wachtwoord
                </label>
                <div className="mt-2">
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md bg-background px-3 py-1.5 text-base text-foreground outline-1 -outline-offset-1 outline-border focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm/6 font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Bezig…" : "Wachtwoord opslaan"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}