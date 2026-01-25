"use client";

import React from "react";

export default function RightRail() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 md:block"
    >
      <div className="flex flex-col items-center gap-10">
        <Dot active={false} />
        <Dot active={true} />
        <Dot active={false} />
      </div>
      <div className="mx-auto mt-6 h-28 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <div className="mt-6 flex flex-col items-center gap-3 opacity-40">
        <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
        <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
        <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
      </div>
    </div>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <div
      className={[
        "grid h-10 w-10 place-items-center rounded-full border backdrop-blur",
        active
          ? "border-fuchsia-400/30 bg-fuchsia-500/15 shadow-[0_0_0_6px_rgba(168,85,247,0.10)]"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <div
        className={[
          "h-2.5 w-2.5 rounded-full",
          active ? "bg-fuchsia-300/90" : "bg-white/35",
        ].join(" ")}
      />
    </div>
  );
}
