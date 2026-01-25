"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import PreviewSimulator from "@/components/home/PreviewSimulator";
import StyleKeyframes from "@/components/home/StyleKeyframes";

import PrismaticBackdrop from "@/components/backgrounds/PrismaticBackdrop";
import Aurora from "@/components/backgrounds/Aurora";
import GridAndVignette from "@/components/backgrounds/GridAndVignette";
import NoiseFilm from "@/components/backgrounds/NoiseFilm";
import ParticlesSafe from "@/components/backgrounds/ParticlesSafe";
import CursorOrbs from "@/components/backgrounds/CursorOrbs";
import RightRail from "@/components/backgrounds/RightRail";

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-zinc-100">
      <StyleKeyframes />

      <PrismaticBackdrop />
      <Aurora />
      <GridAndVignette />
      <NoiseFilm />
      <ParticlesSafe />
      <CursorOrbs />
      <RightRail />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
        <Navbar />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto mb-10 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.35)]" />
          <span className="text-xs text-zinc-300">
            Private beta • Two perspectives, one synthesis
          </span>
        </motion.div>

        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.9,
              delay: 0.05,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="text-balance text-4xl font-semibold tracking-tight md:text-6xl"
          >
            <span className="text-zinc-100">Perspective.ai</span>{" "}
            <span className="text-zinc-500">—</span>{" "}
            <span
              className="bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-[length:200%_200%] bg-clip-text text-transparent"
              style={{ animation: "shimmer 6s ease-in-out infinite" }}
            >
              your personal advisor
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.85,
              delay: 0.18,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-zinc-400 md:text-base"
          >
            Get two high-quality viewpoints on anything — decisions, school,
            code, relationships — then we synthesize common ground and next
            steps.
          </motion.p>

          {/* CTA */}
          <motion.div
            id="beta"
            initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.85,
              delay: 0.3,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <div className="flex-1">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl bg-gradient-to-r from-rose-200 via-zinc-100 to-rose-100 px-4 py-2 text-sm font-semibold text-zinc-950 shadow hover:opacity-95"
            >
              Join Beta
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-6 flex items-center justify-center gap-3"
          >
            <button className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-200 backdrop-blur-xl hover:bg-white/10 transition">
              Try it now →
            </button>
            <button className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition">
              Watch demo
            </button>
          </motion.div>
        </div>

        {/* Preview Simulator */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 1.0,
            delay: 0.55,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          className="mx-auto mt-12 max-w-4xl"
        >
          <PreviewSimulator />
        </motion.div>

        <Footer />
      </div>
    </div>
  );
}
