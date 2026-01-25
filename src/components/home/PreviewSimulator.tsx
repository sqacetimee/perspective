"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PreviewKey, SCRIPTS } from "@/components/home/scripts";

export default function PreviewSimulator() {
  const [selected, setSelected] = useState<PreviewKey | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const [promptText, setPromptText] = useState("");
  const [convoRendered, setConvoRendered] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [responseText, setResponseText] = useState("");

  const raf = useRef<number | null>(null);
  const msgIndex = useRef(0);
  const charIndex = useRef(0);
  const stage = useRef<0 | 1 | 2 | 3>(0); // 0 prompt, 1 convo, 2 agreement, 3 response

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setRunning(false);
  };

  const reset = () => {
    stop();
    msgIndex.current = 0;
    charIndex.current = 0;
    stage.current = 0;
    setPromptText("");
    setConvoRendered([]);
    setCurrentLine("");
    setAgreementText("");
    setResponseText("");
    setDone(false);
  };

  // important: cleanup on unmount
  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, []);

  const play = (key: PreviewKey) => {
    reset();
    setSelected(key);
    setRunning(true);

    const script = SCRIPTS[key];

    const cps = 46;
    let last = performance.now();

    const pause = (ms: number) => {
      // use a timeout but keep it cancellable-ish
      const t = window.setTimeout(() => {
        raf.current = requestAnimationFrame(tick);
      }, ms);
      // store timeout id in raf.current slot via casting
      raf.current = t as unknown as number;
    };

    const tick = (now: number) => {
      const dt = Math.min(60, now - last);
      last = now;
      const inc = Math.max(1, Math.floor((cps * dt) / 1000));

      // stage 0: prompt
      if (stage.current === 0) {
        const full = script.prompt;
        charIndex.current = Math.min(full.length, charIndex.current + inc);
        setPromptText(full.slice(0, charIndex.current));

        if (charIndex.current >= full.length) {
          stage.current = 1;
          charIndex.current = 0;
          pause(180);
          return;
        }

        raf.current = requestAnimationFrame(tick);
        return;
      }

      // stage 1: conversation
      if (stage.current === 1) {
        const m = script.convo[msgIndex.current];
        const full = m.text;

        charIndex.current = Math.min(full.length, charIndex.current + inc);
        setCurrentLine(full.slice(0, charIndex.current));

        if (charIndex.current >= full.length) {
          setConvoRendered((prev) => [...prev, full]);
          setCurrentLine("");
          msgIndex.current += 1;
          charIndex.current = 0;

          if (msgIndex.current >= script.convo.length) {
            stage.current = 2;
          } else {
            pause(130);
            return;
          }
        }

        raf.current = requestAnimationFrame(tick);
        return;
      }

      // stage 2: agreement
      if (stage.current === 2) {
        const full = script.agreement;
        charIndex.current = Math.min(full.length, charIndex.current + inc);
        setAgreementText(full.slice(0, charIndex.current));

        if (charIndex.current >= full.length) {
          stage.current = 3;
          charIndex.current = 0;
          pause(160);
          return;
        }

        raf.current = requestAnimationFrame(tick);
        return;
      }

      // stage 3: response
      const full = script.response;
      charIndex.current = Math.min(full.length, charIndex.current + inc);
      setResponseText(full.slice(0, charIndex.current));

      if (charIndex.current >= full.length) {
        setRunning(false);
        setDone(true);
        raf.current = null;
        return;
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
  };

  const options: PreviewKey[] = ["relationship", "code", "general"];
  const active = selected ? SCRIPTS[selected] : null;

  const progress = useMemo(() => {
    if (!active) return 0;

    const convoTotal = active.convo.reduce((a, m) => a + m.text.length, 0);
    const total =
      active.prompt.length +
      convoTotal +
      active.agreement.length +
      active.response.length;

    const convoDone =
      convoRendered.reduce((a, t) => a + t.length, 0) + currentLine.length;

    const current =
      promptText.length + convoDone + agreementText.length + responseText.length;

    return total ? Math.min(1, current / total) : 0;
  }, [active, promptText, convoRendered, currentLine, agreementText, responseText]);

  const showChecks = !!active && done;

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_35px_140px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.10] via-transparent to-transparent" />

        {/* extra glow accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-[380px] w-[380px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.10), transparent 60%), radial-gradient(circle at 70% 70%, rgba(168,85,247,0.10), transparent 60%)",
            animation: "slowspin 18s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-48 -bottom-48 h-[460px] w-[460px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(236,72,153,0.10), transparent 60%), radial-gradient(circle at 70% 70%, rgba(99,102,241,0.10), transparent 60%)",
            animation: "slowspin 22s ease-in-out infinite",
          }}
        />

        <div className="relative p-6 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/40 to-indigo-500/25 shadow-[0_0_30px_rgba(168,85,247,0.18)]">
                <div className="h-6 w-6 rounded-xl border border-white/20 bg-white/10" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Preview</div>
                <div className="text-xs text-zinc-500">
                  Select a scenario • Prompt → AI conversation → agreement → response
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10 transition"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && play(selected)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  selected
                    ? "bg-white text-zinc-950 hover:bg-zinc-200"
                    : "bg-white/10 text-zinc-500 cursor-not-allowed",
                ].join(" ")}
              >
                {done ? "Replay" : running ? "Running…" : "Play"}
              </button>
            </div>
          </div>

          {/* Tiles */}
          <div className="grid gap-3 md:grid-cols-3">
            {options.map((k) => {
              const d = SCRIPTS[k];
              const isActive = selected === k;

              return (
                <motion.button
                  key={k}
                  type="button"
                  onClick={() => play(k)}
                  whileHover={{ y: -3, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className={[
                    "group relative overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition",
                    isActive
                      ? "border-white/20 bg-white/[0.09]"
                      : "border-white/10 bg-white/[0.05] hover:bg-white/[0.075]",
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                    <div
                      className={[
                        "absolute -inset-24 blur-3xl",
                        `bg-gradient-to-r ${d.accent}`,
                      ].join(" ")}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
                  </div>

                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.10) 22%, transparent 45%)",
                      backgroundSize: "200% 200%",
                      animation: "shimmer 2.8s ease-in-out infinite",
                    }}
                  />

                  <div className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zinc-100">
                        {d.title}
                      </div>
                      <div
                        className={[
                          "rounded-full border px-3 py-1 text-xs",
                          isActive
                            ? "border-white/18 bg-white/10 text-zinc-200"
                            : "border-white/10 bg-white/5 text-zinc-400",
                        ].join(" ")}
                      >
                        {isActive
                          ? running
                            ? "Running…"
                            : done
                            ? "Done"
                            : "Ready"
                          : "Click"}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">{d.subtitle}</div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <span
                        className={[
                          "inline-flex h-2 w-2 rounded-full",
                          isActive ? "bg-emerald-400/80" : "bg-white/25",
                        ].join(" ")}
                      />
                      <span>{isActive ? "Selected" : "Select to run"}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/20">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="h-full bg-gradient-to-r from-fuchsia-300/70 via-white/65 to-indigo-300/70"
            />
          </div>

          {!active && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              Select a scenario above to run the preview.
            </div>
          )}

          {active && (
            <>
              {/* Prompt (typed) */}
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">Prompt</div>
                  <div className="text-xs text-zinc-500">
                    {running ? "running" : done ? "complete" : "ready"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  {promptText || <span className="text-zinc-500">…</span>}
                  {running && stage.current === 0 && (
                    <span className="ml-1 inline-block h-4 w-[2px] translate-y-[2px] bg-white/55 animate-pulse" />
                  )}
                </div>
              </div>

              {/* AI conversation */}
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-zinc-100">
                      AI conversation
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
                      empathy + logic
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-2 w-2 rounded-full bg-fuchsia-300/80" />
                      Empathy AI {showChecks && <GreenCheck />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-2 w-2 rounded-full bg-sky-300/80" />
                      Logic AI {showChecks && <GreenCheck />}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {active.convo.map((m, idx) => {
                    const rendered = convoRendered[idx] ?? "";
                    const isTypingThis =
                      idx === convoRendered.length && currentLine.length > 0;

                    const text =
                      idx < convoRendered.length
                        ? rendered
                        : isTypingThis
                        ? currentLine
                        : "";

                    if (!text) {
                      return (
                        <div key={idx} className="opacity-20">
                          <AiChatBubble who={m.who} text="…" muted />
                        </div>
                      );
                    }

                    return (
                      <AiChatBubble
                        key={idx}
                        who={m.who}
                        text={text}
                        caret={running && isTypingThis}
                      />
                    );
                  })}

                  {/* Agreement */}
                  <div className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-200">
                        Agreement
                      </div>
                      <div className="text-xs text-emerald-200/70">
                        {done ? "confirmed" : agreementText ? "forming…" : "pending"}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-100/90">
                      {agreementText || <span className="text-emerald-200/40">…</span>}
                      {running && stage.current === 2 && (
                        <span className="ml-1 inline-block h-4 w-[2px] translate-y-[2px] bg-emerald-200/70 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Final response */}
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">Response</div>
                  <div className="text-xs text-zinc-500">
                    {running ? "typing…" : done ? "sent" : "waiting"}
                  </div>
                </div>

                <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  {responseText || <span className="text-zinc-500">…</span>}
                  {running && stage.current === 3 && (
                    <span className="ml-1 inline-block h-4 w-[2px] translate-y-[2px] bg-white/55 animate-pulse" />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AiChatBubble({
  who,
  text,
  caret,
  muted,
}: {
  who: "Empathy AI" | "Logic AI";
  text: string;
  caret?: boolean;
  muted?: boolean;
}) {
  const isEmpathy = who === "Empathy AI";

  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border backdrop-blur",
          isEmpathy
            ? "border-fuchsia-400/25 bg-fuchsia-500/10"
            : "border-sky-400/25 bg-sky-500/10",
          muted ? "opacity-40" : "",
        ].join(" ")}
      >
        <div
          className={[
            "h-3.5 w-3.5 rounded-xl",
            isEmpathy
              ? "bg-gradient-to-br from-fuchsia-300/80 to-indigo-300/70"
              : "bg-gradient-to-br from-sky-300/80 to-cyan-300/70",
          ].join(" ")}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">{who}</div>
          <div className="text-[11px] text-zinc-600">
            {muted ? "…" : caret ? "typing…" : ""}
          </div>
        </div>

        <div
          className={[
            "mt-1 rounded-2xl border p-3 text-sm leading-relaxed",
            "border-white/10 bg-white/[0.05] text-zinc-200",
            muted ? "opacity-40" : "",
          ].join(" ")}
        >
          <div className="whitespace-pre-wrap">
            {text}
            {caret && (
              <span className="ml-1 inline-block h-4 w-[2px] translate-y-[2px] bg-white/50 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GreenCheck() {
  return (
    <span className="inline-flex items-center justify-center">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="ml-1"
        aria-hidden
      >
        <path
          d="M20 6L9 17l-5-5"
          stroke="rgba(52,211,153,0.95)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
