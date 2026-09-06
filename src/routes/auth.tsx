import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plug } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Inloggen — Shoplabel" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  // Gebruikersnaam zonder @ wordt omgezet naar een intern e-mailadres (bijv. admin)
  function resolveEmail(value: string) {
    const v = value.trim();
    return v.includes("@") ? v : `${v.toLowerCase()}@shoplabel.local`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: resolveEmail(email),
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account aangemaakt. Je bent ingelogd.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: resolveEmail(email),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Er ging iets mis";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Vul eerst je e-mailadres in.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Check je mail voor de herstel-link.");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
            S
          </div>
          <h1 className="mt-6 text-center text-2xl/9 font-bold tracking-tight text-foreground">
            {isSignup ? "Maak je account aan" : "Log in op je account"}
          </h1>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-card px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm/6 font-medium text-foreground">
                  E-mailadres
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md bg-background px-3 py-1.5 text-base text-foreground outline-1 -outline-offset-1 outline-border placeholder:text-muted-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm/6 font-medium text-foreground">
                  Wachtwoord
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md bg-background px-3 py-1.5 text-base text-foreground outline-1 -outline-offset-1 outline-border placeholder:text-muted-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <div className="flex h-6 shrink-0 items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-4 rounded-sm border border-border accent-[var(--primary)]"
                    />
                  </div>
                  <label htmlFor="remember-me" className="block text-sm/6 text-foreground">
                    Ingelogd blijven
                  </label>
                </div>
                <div className="text-sm/6">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-semibold text-primary hover:text-primary/80"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm/6 font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {loading ? "Bezig…" : isSignup ? "Account maken" : "Inloggen"}
                </button>
              </div>
            </form>

            <div>
              <div className="mt-10 flex items-center gap-x-6">
                <div className="w-full flex-1 border-t border-border" />
                <p className="text-sm/6 font-medium text-nowrap text-foreground">Of ga verder met</p>
                <div className="w-full flex-1 border-t border-border" />
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Lightspeed App Store SSO wordt geactiveerd zodra onze partner-credentials zijn goedgekeurd.",
                    )
                  }
                  className="flex w-full items-center justify-center gap-3 rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-xs ring-1 ring-inset ring-border transition-colors hover:bg-muted"
                >
                  <Plug className="size-5 text-primary" />
                  <span className="text-sm/6 font-semibold">Lightspeed App Store</span>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm/6 text-muted-foreground">
            {isSignup ? "Heb je al een account?" : "Nog geen account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="font-semibold text-primary hover:text-primary/80"
            >
              {isSignup ? "Inloggen" : "Account aanmaken"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}