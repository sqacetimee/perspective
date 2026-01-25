import StyleKeyframes from "@/components/home/StyleKeyframes";

import PrismaticBackdrop from "@/components/backgrounds/PrismaticBackdrop";
import Aurora from "@/components/backgrounds/Aurora";
import GridAndVignette from "@/components/backgrounds/GridAndVignette";
import NoiseFilm from "@/components/backgrounds/NoiseFilm";
import ParticlesSafe from "@/components/backgrounds/ParticlesSafe";
import CursorOrbs from "@/components/backgrounds/CursorOrbs";
import RightRail from "@/components/backgrounds/RightRail";

export default function Loading() {
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

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mx-auto mt-24 max-w-3xl text-center">
          <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 backdrop-blur-xl">
            Loading…
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="h-4 w-44 rounded bg-white/10" />
            <div className="mt-5 space-y-3">
              <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
              <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
              <div className="h-16 rounded-2xl bg-white/5 border border-white/10" />
            </div>

            <div className="mt-6 h-12 rounded-2xl bg-black/20 border border-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
