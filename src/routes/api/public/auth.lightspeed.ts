import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/lightspeed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleLightspeedCallback } = await import("@/lib/lightspeed-oauth.server");
        return handleLightspeedCallback(request);
      },
    },
  },
});