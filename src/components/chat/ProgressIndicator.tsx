"use client";

import React from "react";

export default function ProgressIndicator({
  percent,
  description,
}: {
  stage?: string;
  percent: number;
  description?: string;
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-200 via-zinc-100 to-rose-100 transition-[width] duration-300"
          style={{ width: `${safe}%` }}
        />
      </div>

      {description ? (
        <div className="mt-2 text-[11px] text-zinc-500">{description}</div>
      ) : null}
    </div>
  );
}
