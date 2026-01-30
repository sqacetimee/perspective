"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface ChatMessage {
  type: string;
  content?: string;
  agent?: string;
  round?: number;
  state?: string;
  timestamp?: number;
}

export interface ProgressState {
  stage: string;
  percent: number;
  description: string;
}

export interface RoundData {
  number: number;
  agentA?: { content: string; thinking: boolean };
  agentB?: { content: string; thinking: boolean };
}

export interface ChatState {
  initSession: (message: string) => Promise<void>;
  submitClarification: (answers: string) => Promise<void>;
  messages: ChatMessage[];
  state: string;
  sessionId: string | null;
  error: string | null;
  progress: ProgressState;
  rounds: RoundData[];
  currentRound: number;
}

function getHttpBase() {
  // Use relative path (Nginx proxies /api to backend)
  return (
    process.env.NEXT_PUBLIC_BACKEND_HTTP?.replace(/\/$/, "") ||
    window.location.origin
  );
}

function getWsBase() {
  // Use current origin but switch protocol (ws/wss)
  // Nginx proxies /api/ws to backend
  if (process.env.NEXT_PUBLIC_BACKEND_WS) {
    return process.env.NEXT_PUBLIC_BACKEND_WS.replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
}

export function useMultiPerspectiveChat(): ChatState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<string>("INIT");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    stage: "idle",
    percent: 0,
    description: "",
  });
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback((sid: string) => {
    if (wsRef.current) wsRef.current.close();

    const fetchSessionHistory = async (sid2: string) => {
      try {
        const httpBase = getHttpBase();
        const res = await fetch(`${httpBase}/api/chat/${sid2}`);
        if (res.ok) {
          const session = await res.json();
          const historyMessages: ChatMessage[] = (session.history || []).map((h: any) => ({
            type: h.agent === "SYNTHESIS" ? "synthesis" : "agent_output",
            content: h.content,
            agent: h.agent,
            round: h.round_number,
          }));
          setMessages(historyMessages);
        }
      } catch (err) {
        console.error("Failed to fetch session history:", err);
      }
    };

    const wsBase = getWsBase();
    const wsUrl = `${wsBase}/api/ws/${sid}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log("[WS] Connected:", wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "state_change") {
          setState(message.state);

          if (message.state === "CLARIFICATION_GENERATING") {
            setProgress({
              stage: "clarification_generating",
              percent: 5,
              description: "Generating clarification questions...",
            });
          } else if (message.state === "CLARIFICATION_PENDING") {
            setProgress({
              stage: "clarification_pending",
              percent: 10,
              description: "Waiting for your answers...",
            });
          } else if (message.state === "COMPLETE") {
            setProgress({ stage: "complete", percent: 100, description: "Complete" });
            fetchSessionHistory(sid);
          }
        } else if (message.type === "progress") {
          setProgress({
            stage: message.stage || "processing",
            percent: message.progress_percent || 0,
            description: message.description || "",
          });

          const roundMatch = message.stage?.match(/round_(\d+)/);
          if (roundMatch) setCurrentRound(parseInt(roundMatch[1], 10));
        } else if (message.type === "agent_output" || message.type === "synthesis") {
          setMessages((prev) => [...prev, message]);

          if (message.round && message.agent) {
            setRounds((prev) => {
              const existing = prev.find((r) => r.number === message.round);
              if (existing) {
                return prev.map((r) => {
                  if (r.number !== message.round) return r;
                  if (message.agent === "EXPANSION") {
                    return { ...r, agentA: { content: message.content, thinking: false } };
                  }
                  if (message.agent === "COMPRESSION") {
                    return { ...r, agentB: { content: message.content, thinking: false } };
                  }
                  return r;
                });
              }

              const newRound: RoundData = {
                number: message.round,
                agentA: message.agent === "EXPANSION" ? { content: message.content, thinking: false } : undefined,
                agentB: message.agent === "COMPRESSION" ? { content: message.content, thinking: false } : undefined,
              };

              return [...prev, newRound].sort((a, b) => a.number - b.number);
            });

            setCurrentRound(message.round);

            const percent = 10 + (message.round - 1) * 16 + (message.agent === "COMPRESSION" ? 16 : 8);
            setProgress({
              stage: `round_${message.round}`,
              percent: Math.min(percent, 90),
              description: `Round ${message.round}`,
            });
          }
        } else if (message.type === "error") {
          setError(message.content || "Backend error");
          setState("ERROR");
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
    };

    wsRef.current = ws;
  }, []);

  const initSession = useCallback(
    async (userPrompt: string) => {
      try {
        setState("INIT");
        setProgress({
          stage: "clarification_generating",
          percent: 5,
          description: "Analyzing and generating questions...",
        });
        setMessages([]);
        setRounds([]);
        setCurrentRound(0);
        setError(null);

        const httpBase = getHttpBase();
        const response = await fetch(`${httpBase}/api/chat/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userPrompt }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to initialize session (${response.status}) ${text}`);
        }

        const data = await response.json();
        setSessionId(data.session_id);
        setState(data.status);
        connectWebSocket(data.session_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [connectWebSocket]
  );

  const submitClarification = useCallback(
    async (answers: string) => {
      if (!sessionId) return;
      try {
        const httpBase = getHttpBase();
        const response = await fetch(`${httpBase}/api/chat/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, answers }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to submit clarification (${response.status}) ${text}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [sessionId]
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { initSession, submitClarification, messages, state, sessionId, error, progress, rounds, currentRound };
}
