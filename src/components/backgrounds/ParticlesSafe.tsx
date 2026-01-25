"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function ParticlesSafe() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dots = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 26 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      dur: Math.random() * 6 + 6,
      delay: Math.random() * 6,
      opacity: Math.random() * 0.35 + 0.15,
    }));
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animation: `floaty ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
