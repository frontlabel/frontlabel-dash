import { hexToRgba, type AgeVerificationSettings } from "@/lib/apps-catalog";

export function AgeVerificationPreview({ s }: { s: AgeVerificationSettings }) {
  const overlay = hexToRgba(s.overlayColor, s.overlayOpacity);
  return (
    <div
      className="relative w-full aspect-[9/16] max-h-[640px] rounded-lg overflow-hidden border border-border shadow-inner bg-muted"
      style={{
        backgroundImage:
          "linear-gradient(135deg, oklch(0.85 0.02 240) 25%, transparent 25%), linear-gradient(225deg, oklch(0.85 0.02 240) 25%, transparent 25%), linear-gradient(45deg, oklch(0.85 0.02 240) 25%, transparent 25%), linear-gradient(315deg, oklch(0.85 0.02 240) 25%, oklch(0.94 0.008 240) 25%)",
        backgroundPosition: "10px 0, 10px 0, 0 0, 0 0",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        style={{
          background: s.backgroundImageUrl
            ? `linear-gradient(${overlay}, ${overlay}), url(${s.backgroundImageUrl}) center/cover no-repeat`
            : overlay,
        }}
      >
        <div
          className="w-full max-w-[300px] p-6 text-center shadow-xl"
          style={{
            background: s.backgroundColor,
            color: s.textColor,
            fontFamily: s.fontFamily,
            borderRadius: `${s.borderRadius}px`,
          }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: s.textColor }}>
            {s.title}
          </h2>
          <p className="text-xs opacity-80 mb-4">{s.description}</p>
          <button
            className="w-full py-3 rounded text-sm font-semibold text-white"
            style={{
              background: s.primaryColor,
              borderRadius: `${Math.max(4, s.borderRadius - 4)}px`,
            }}
          >
            {s.buttonText}
          </button>
          <button
            className="mt-2 w-full py-3 rounded text-sm font-semibold bg-white text-gray-900 border border-black/15"
            style={{ borderRadius: `${Math.max(4, s.borderRadius - 4)}px` }}
          >
            {s.declineText}
          </button>
        </div>
      </div>
    </div>
  );
}