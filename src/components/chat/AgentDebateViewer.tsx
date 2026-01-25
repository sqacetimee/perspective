"use client";

import React from "react";

type RoundData = {
  number: number;
  agentA?: { content: string; thinking: boolean };
  agentB?: { content: string; thinking: boolean };
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

export default function AgentDebateViewer({
  rounds,
  currentRound,
  isProcessing,
}: {
  rounds: RoundData[];
  currentRound: number;
  isProcessing: boolean;
}) {
  const sorted = [...(rounds || [])].sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Pill>Round {currentRound || 0}</Pill>
        <Pill>{isProcessing ? "Live" : "Paused"}</Pill>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          Waiting for agents…
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <div
              key={r.number}
              className="rounded-2xl border border-white/10 bg-black/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-200">
                  Round {r.number}
                </div>
                <div className="text-xs text-zinc-500">
                  {r.number === currentRound && isProcessing ? "updating…" : ""}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <div className="mb-2 text-xs font-semibold text-zinc-200">
                    Agent A (Expansion)
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200/90">
                    {r.agentA?.content || (
                      <span className="text-zinc-500">…</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <div className="mb-2 text-xs font-semibold text-zinc-200">
                    Agent B (Compression)
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200/90">
                    {r.agentB?.content || (
                      <span className="text-zinc-500">…</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtle footer hint */}
      <div className="text-[11px] text-zinc-500">
        Tip: Use “Hide debate” if you only want the final synthesis.
      </div>
    </div>
  );
}
