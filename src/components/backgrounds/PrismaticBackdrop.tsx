"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function PrismaticBackdrop() {
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 opacity-[0.8]">
        <div className="absolute -left-64 -top-64 h-[520px] w-[520px] rounded-full blur-3xl bg-[radial-gradient(circle_at_30%_30%,rgba(168,85,247,0.18),transparent_60%)]" />
        <div className="absolute -right-72 -top-40 h-[560px] w-[560px] rounded-full blur-3xl bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.14),transparent_60%)]" />
        <div className="absolute left-1/2 top-[60%] h-[720px] w-[720px] -translate-x-1/2 rounded-full blur-3xl bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.10),transparent_62%)]" />
      </div>

      <div
        className="absolute left-1/2 top-[52%] h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] blur-2xl"
        style={{
          background:
            "conic-gradient(from 120deg, rgba(168,85,247,0.35), rgba(56,189,248,0.25), rgba(236,72,153,0.30), rgba(99,102,241,0.25), rgba(168,85,247,0.35))",
          animation: "slowspin 22s ease-in-out infinite",
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-[0.9]"
        style={{
          // @ts-expect-error CSS vars
          "--x": sx,
          "--y": sy,
          background:
            "radial-gradient(380px circle at var(--x) var(--y), rgba(255,255,255,0.08), transparent 60%)",
        }}
      />

      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:1px_6px]" />
    </div>
  );
}
