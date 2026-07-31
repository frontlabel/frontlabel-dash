import { createFileRoute } from "@tanstack/react-router";

// Alias van /api/public/auth/lightspeed zodat beide callback-URLs werken.
export const Route = createFileRoute("/api/auth/lightspeed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleLightspeedCallback } = await import("@/lib/lightspeed-oauth.server");
        return handleLightspeedCallback(request);
      },
    },
  },
});