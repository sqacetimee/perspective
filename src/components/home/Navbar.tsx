"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-start justify-between px-6 py-4"
    >
      {/* LEFT: Logo */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="h-5 w-5 rounded-xl bg-gradient-to-br from-fuchsia-400/70 to-indigo-400/70" />
        </div>

        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">
            Perspective.ai
          </div>
          <div className="text-xs text-zinc-500">
            Two lenses. One answer.
          </div>
        </div>
      </div>

     
    </motion.div>
  );
}
