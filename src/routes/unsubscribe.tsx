import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  component: UnsubscribePage,
});

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  async function confirm() {
    if (!token) return;
    setState("loading");
    try {
      const r = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success) setState("success");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Uitschrijven</h1>
        <div className="mt-4 text-sm text-muted-foreground">
          {state === "loading" && "Een moment geduld…"}
          {state === "invalid" && "Deze uitschrijflink is niet (meer) geldig."}
          {state === "error" && "Er ging iets mis. Probeer het later opnieuw."}
          {state === "already" && "Je bent al uitgeschreven van onze e-mails."}
          {state === "valid" && "Weet je zeker dat je je wilt uitschrijven? Je ontvangt dan geen e-mails meer van Shoplabel-apps."}
          {state === "success" && "Je bent uitgeschreven. Je ontvangt geen e-mails meer."}
        </div>
        {state === "valid" && (
          <Button className="mt-6" onClick={confirm}>Bevestig uitschrijven</Button>
        )}
      </div>
    </div>
  );
}