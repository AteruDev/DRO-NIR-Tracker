"use client";

import { useState } from "react";

// To use the real logo: save it as  public/depdev-logo.png  (a PNG with a
// transparent background works best). Until that file exists, a placeholder
// circle is shown instead — no code changes needed.
export default function Logo({ size = 52 }: { size?: number }) {
  const [missing, setMissing] = useState(false);
  const box = { width: size, height: size };

  if (missing) {
    return (
      <div
        style={box}
        aria-label="DEPDev logo placeholder"
        className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/60 bg-white/10 text-[9px] font-bold uppercase tracking-wide text-white/80"
      >
        Logo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/depdev-logo.png"
      alt="DEPDev"
      style={box}
      onError={() => setMissing(true)}
      className="shrink-0 rounded-full bg-white object-contain p-0.5 shadow-md"
    />
  );
}