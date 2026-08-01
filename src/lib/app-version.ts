/** Injected at build time via vite.config.ts */
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_TIME__: string | undefined;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export const BUILD_TIME =
  typeof __BUILD_TIME__ !== "undefined"
    ? __BUILD_TIME__
    : new Date().toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

/** e.g. "v1.1.0 · 01-08-2026 07:47" */
export const APP_VERSION_LABEL = `v${APP_VERSION} · ${BUILD_TIME}`;
