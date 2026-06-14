import type { AgeVerificationSettings } from "@/lib/apps-catalog";

export function AgeVerificationPreview({ s }: { s: AgeVerificationSettings }) {
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
            ? `${s.overlayColor}, url(${s.backgroundImageUrl}) center/cover no-repeat`
            : s.overlayColor,
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
          <div
            className="mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: s.primaryColor }}
          >
            {s.minAge}+
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: s.textColor }}>
            {s.title}
          </h2>
          <p className="text-xs opacity-80 mb-4">{s.description}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input readOnly placeholder="DD" className="w-full text-center text-sm py-1.5 border rounded" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
            <input readOnly placeholder="MM" className="w-full text-center text-sm py-1.5 border rounded" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
            <input readOnly placeholder="JJJJ" className="w-full text-center text-sm py-1.5 border rounded" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
          </div>
          <button
            className="w-full py-2 rounded text-sm font-medium text-white"
            style={{
              background: s.primaryColor,
              borderRadius: `${Math.max(4, s.borderRadius - 4)}px`,
            }}
          >
            {s.buttonText}
          </button>
          <button className="mt-2 text-xs opacity-60 hover:opacity-100">
            {s.declineText}
          </button>
        </div>
      </div>
    </div>
  );
}