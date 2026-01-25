"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import StyleKeyframes from "@/components/home/StyleKeyframes";

import PrismaticBackdrop from "@/components/backgrounds/PrismaticBackdrop";
import Aurora from "@/components/backgrounds/Aurora";
import GridAndVignette from "@/components/backgrounds/GridAndVignette";
import NoiseFilm from "@/components/backgrounds/NoiseFilm";
import ParticlesSafe from "@/components/backgrounds/ParticlesSafe";
import CursorOrbs from "@/components/backgrounds/CursorOrbs";
import RightRail from "@/components/backgrounds/RightRail";

import AgentDebateViewer from "@/components/chat/AgentDebateViewer";
import ProgressIndicator from "@/components/chat/ProgressIndicator";
import { useMultiPerspectiveChat } from "@/components/home/useMultiPerspectiveChat";

function cn(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function ChatBubble({
  role,
  title,
  content,
}: {
  role: "system" | "agent" | "synthesis" | "agent_expansion" | "agent_compression";
  title: string;
  content: string;
}) {
  const base = "rounded-2xl border p-3 backdrop-blur-xl";
  let styles = "border-white/10 bg-black/20"; // default

  if (role === "synthesis") {
    styles = "border-emerald-400/30 bg-emerald-500/20"; // Green tint (enhanced)
  } else if (role === "system") {
    styles = "border-white/10 bg-white/[0.06]";
  } else if (role === "agent_expansion") {
    styles = "border-pink-300/20 bg-pink-400/10"; // Light pink
  } else if (role === "agent_compression") {
    styles = "border-rose-500/20 bg-rose-900/30"; // Purplish red
  }

  return (
    <div className={cn(base, styles)}>
      <div className="mb-1 text-xs font-semibold text-zinc-200">{title}</div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/90">
        {content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const chat = useMultiPerspectiveChat();

  const [input, setInput] = useState("");
  const [clarify, setClarify] = useState("");
  const [showAIConversation, setShowAIConversation] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const feed = useMemo(() => {
    const out: Array<{
      role: "system" | "agent" | "synthesis" | "agent_expansion" | "agent_compression";
      title: string;
      content: string;
    }> = [];

    if (!chat.sessionId) {
      out.push({
        role: "system",
        title: "Welcome",
        content: "What's on your mind today?",
      });
      if (chat.error) out.push({ role: "system", title: "Error", content: chat.error });
      return out;
    }

    out.push({
      role: "system",
      title: "Session",
      content: `Connected • ${chat.sessionId.slice(0, 8)}… • State: ${chat.state}`,
    });

    for (const m of chat.messages) {
      if (!m.content) continue;

      if (m.agent === "CLARIFICATION") {
        out.push({ role: "system", title: "Clarification", content: m.content });
      } else if (m.agent === "SYNTHESIS" || m.type === "synthesis") {
        out.push({ role: "synthesis", title: "Synthesis", content: m.content });
      } else if (m.type === "agent_output") {
        // ONLY show agent output if showAIConversation is TRUE
        if (showAIConversation) {
          const isExpansion = m.agent === "EXPANSION";
          const isCompression = m.agent === "COMPRESSION";

          let role: "agent" | "agent_expansion" | "agent_compression" = "agent";
          if (isExpansion) role = "agent_expansion";
          if (isCompression) role = "agent_compression";

          const name = isExpansion ? "Agent A (Expansion)" : isCompression ? "Agent B (Compression)" : (m.agent || "Agent");

          out.push({ role, title: name, content: m.content });
        }
      }
    }

    if (chat.error) out.push({ role: "system", title: "Error", content: chat.error });
    return out;
  }, [chat.messages, chat.sessionId, chat.state, chat.error, showAIConversation]);

  const clarificationPending = chat.state === "CLARIFICATION_PENDING";

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [feed.length, clarificationPending]);

  const start = async () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    setClarify("");
    await chat.initSession(t);
  };

  const [isClarificationSubmitted, setIsClarificationSubmitted] = useState(false);

  // Reset local submission state when global state changes effectively
  useEffect(() => {
    if (chat.state !== "CLARIFICATION_PENDING") {
      setIsClarificationSubmitted(false);
    }
  }, [chat.state]);

  const submitClarification = async () => {
    const t = clarify.trim();
    if (!t) return;
    setIsClarificationSubmitted(true); // Optimistic hide
    await chat.submitClarification(t);
    setClarify("");
  };

  const isProcessing =
    !!chat.sessionId && chat.state !== "COMPLETE" && chat.state !== "ERROR";

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

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition"
            >
              ← Back
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              Perspective Chat
            </motion.h1>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAIConversation((v) => !v)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 backdrop-blur-xl hover:bg-white/10 transition"
          >
            {showAIConversation ? "Hide AI conversation" : "View AI Conversation"}
          </motion.button>
        </div>

        {/* AI convo pops ABOVE */}
        <AnimatePresence>
          {showAIConversation && (
            <motion.div
              initial={{ opacity: 0, y: -8, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(10px)" }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-6 mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-100">
                  AI conversation (live)
                </div>
                <div className="text-xs text-zinc-500">
                  {chat.sessionId ? (isProcessing ? "streaming" : "complete") : "waiting"}
                </div>
              </div>

              <AgentDebateViewer
                rounds={chat.rounds}
                currentRound={chat.currentRound}
                isProcessing={isProcessing}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main chat box */}
        <div className="relative mt-5 mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {/* Soul Glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-black/0 to-black/0" />
          <div className="pointer-events-none absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                {chat.sessionId ? (
                  <>
                    Session{" "}
                    <span className="text-zinc-200">
                      {chat.sessionId.slice(0, 8)}…
                    </span>{" "}
                    • <span className="text-zinc-200">{chat.state}</span>
                  </>
                ) : (
                  "No session"
                )}
                {chat.error ? (
                  <span className="ml-2 text-rose-300">• {chat.error}</span>
                ) : null}
              </div>

              <div className="hidden md:block w-[320px]">
                <ProgressIndicator
                  percent={chat.progress.percent}
                  description={chat.progress.description}
                />
              </div>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="h-[48vh] md:h-[52vh] overflow-y-auto px-4 py-4 space-y-3"
          >
            {feed.map((m, idx) => (
              <ChatBubble key={idx} role={m.role} title={m.title} content={m.content} />
            ))}

            {clarificationPending && !isClarificationSubmitted && (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <div className="text-xs font-semibold text-cyan-200">
                  Answer clarification
                </div>
                <textarea
                  value={clarify}
                  onChange={(e) => setClarify(e.target.value)}
                  rows={4}
                  placeholder={"1) ...\n2) ...\n3) ..."}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-white/20"
                />
                <div className="mt-3 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitClarification}
                    disabled={!clarify.trim()}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold shadow transition",
                      clarify.trim()
                        ? "bg-white text-zinc-950 hover:bg-zinc-200"
                        : "bg-white/10 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    Submit
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-black/20 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder="Message Perspective…"
                className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={start}
                disabled={!input.trim()}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold shadow transition",
                  input.trim()
                    ? "bg-gradient-to-r from-rose-200 via-zinc-100 to-rose-100 text-zinc-950 hover:opacity-95"
                    : "bg-white/10 text-zinc-500 cursor-not-allowed"
                )}
              >
                Send
              </motion.button>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Click “View AI Conversation” to watch agents live.
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
