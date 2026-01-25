"use client";

import React from "react";

export default function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-48 -top-52 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(236,72,153,0.22), transparent 55%), radial-gradient(circle at 60% 60%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(circle at 40% 70%, rgba(34,211,238,0.12), transparent 55%)",
          animation: "slowspin 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-64 top-6 h-[620px] w-[620px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(248,113,113,0.14), transparent 55%), radial-gradient(circle at 60% 60%, rgba(168,85,247,0.17), transparent 55%), radial-gradient(circle at 40% 70%, rgba(56,189,248,0.10), transparent 55%)",
          animation: "slowspin 16s ease-in-out infinite",
        }}
      />
      <div className="absolute left-1/2 top-[55%] h-[760px] w-[760px] -translate-x-1/2 rounded-full blur-3xl bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_60%)]" />
    </div>
  );
}
