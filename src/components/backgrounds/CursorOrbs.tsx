"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CursorOrbs() {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const x2 = useMotionValue(-1000);
  const y2 = useMotionValue(-1000);

  const sx = useSpring(x, { stiffness: 120, damping: 18 });
  const sy = useSpring(y, { stiffness: 120, damping: 18 });
  const sx2 = useSpring(x2, { stiffness: 60, damping: 22 });
  const sy2 = useSpring(y2, { stiffness: 60, damping: 22 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      x2.set(e.clientX + 120);
      y2.set(e.clientY - 80);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y, x2, y2]);

  return (
    <>
      <motion.div
        aria-hidden
        style={{ left: sx, top: sy }}
        className="pointer-events-none fixed z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.16),rgba(59,130,246,0.08),transparent_60%)] blur-2xl" />
      </motion.div>

      <motion.div
        aria-hidden
        style={{ left: sx2, top: sy2 }}
        className="pointer-events-none fixed z-0 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.14),rgba(34,211,238,0.06),transparent_60%)] blur-2xl" />
      </motion.div>
    </>
  );
}
