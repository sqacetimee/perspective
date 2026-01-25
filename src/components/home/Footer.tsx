"use client";

import React from "react";

export default function Footer() {
  return (
    <div className="mt-12 flex items-center justify-center gap-6 text-xs text-zinc-500">
      <span suppressHydrationWarning>© {new Date().getFullYear()} Perspective.ai</span>
      <span className="opacity-50">•</span>
      <span className="hover:text-zinc-300 cursor-pointer transition">
        Privacy
      </span>
      <span className="opacity-50">•</span>
      <span className="hover:text-zinc-300 cursor-pointer transition">Terms</span>
    </div>
  );
}
