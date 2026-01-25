'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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

export function useMultiPerspectiveChat(): ChatState {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [state, setState] = useState<string>('INIT');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<ProgressState>({ stage: 'idle', percent: 0, description: '' });
    const [rounds, setRounds] = useState<RoundData[]>([]);
    const [currentRound, setCurrentRound] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);

    const connectWebSocket = useCallback((sid: string) => {
        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Helper to fetch full session history
        const fetchSessionHistory = async (sessionId: string) => {
            try {
                const res = await fetch(`/api/chat/${sessionId}`);
                if (res.ok) {
                    const session = await res.json();
                    // Convert history to messages
                    const historyMessages: ChatMessage[] = session.history.map((h: any) => ({
                        type: h.agent === 'SYNTHESIS' ? 'synthesis' : 'agent_output',
                        content: h.content,
                        agent: h.agent,
                        round: h.round_number,
                    }));
                    setMessages(historyMessages);
                }
            } catch (err) {
                console.error('Failed to fetch session history:', err);
            }
        };

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/ws/${sid}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WS] Connected to', wsUrl);
        };

        ws.onmessage = (event) => {
            console.log('[WS] Message received:', event.data);
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'state_change') {
                    setState(message.state);

                    // Update progress based on state
                    if (message.state === 'CLARIFICATION_GENERATING') {
                        setProgress({ stage: 'clarification_generating', percent: 5, description: 'Generating clarification questions...' });
                    } else if (message.state === 'CLARIFICATION_PENDING') {
                        setProgress({ stage: 'clarification_pending', percent: 10, description: 'Waiting for your answers...' });
                    } else if (message.state === 'COMPLETE') {
                        setProgress({ stage: 'complete', percent: 100, description: 'Analysis complete!' });
                        console.log('[WS] State COMPLETE, fetching session history for', sid);
                        fetchSessionHistory(sid);
                    }
                } else if (message.type === 'progress') {
                    // Handle granular progress updates
                    setProgress({
                        stage: message.stage || 'processing',
                        percent: message.progress_percent || 0,
                        description: message.description || ''
                    });

                    // Extract round number from stage
                    const roundMatch = message.stage?.match(/round_(\d+)/);
                    if (roundMatch) {
                        setCurrentRound(parseInt(roundMatch[1]));
                    }
                } else if (message.type === 'agent_output' || message.type === 'synthesis') {
                    setMessages(prev => [...prev, message]);

                    // Organize into rounds for debate viewer
                    if (message.round && message.agent) {
                        setRounds(prev => {
                            const existing = prev.find(r => r.number === message.round);
                            if (existing) {
                                return prev.map(r => {
                                    if (r.number === message.round) {
                                        if (message.agent === 'EXPANSION') {
                                            return { ...r, agentA: { content: message.content, thinking: false } };
                                        } else if (message.agent === 'COMPRESSION') {
                                            return { ...r, agentB: { content: message.content, thinking: false } };
                                        }
                                    }
                                    return r;
                                });
                            } else {
                                const newRound: RoundData = {
                                    number: message.round,
                                    agentA: message.agent === 'EXPANSION' ? { content: message.content, thinking: false } : undefined,
                                    agentB: message.agent === 'COMPRESSION' ? { content: message.content, thinking: false } : undefined,
                                };
                                return [...prev, newRound].sort((a, b) => a.number - b.number);
                            }
                        });
                        setCurrentRound(message.round);

                        // Update progress based on round
                        const percent = 10 + (message.round - 1) * 16 + (message.agent === 'COMPRESSION' ? 16 : 8);
                        setProgress({
                            stage: `round_${message.round}_agent_${message.agent === 'EXPANSION' ? 'a' : 'b'}`,
                            percent: Math.min(percent, 90),
                            description: `Round ${message.round}: ${message.agent === 'EXPANSION' ? 'Agent A' : 'Agent B'}`
                        });
                    }
                } else if (message.type === 'error') {
                    setError(message.content);
                    setState('ERROR');
                }
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        };

        ws.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('Connection error');
        };

        wsRef.current = ws;
    }, []);

    const initSession = useCallback(async (userPrompt: string) => {
        try {
            // Immediately show progress while generating clarification questions
            setState('INIT');
            setProgress({
                stage: 'clarification_generating',
                percent: 5,
                description: 'Analyzing your situation and generating questions...'
            });
            setMessages([]);
            setRounds([]);
            setCurrentRound(0);
            setError(null);

            const response = await fetch('/api/chat/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userPrompt })
            });

            if (!response.ok) {
                throw new Error('Failed to initialize session');
            }

            const data = await response.json();
            setSessionId(data.session_id);
            setState(data.status);

            connectWebSocket(data.session_id);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [connectWebSocket]);

    const submitClarification = useCallback(async (answers: string) => {
        if (!sessionId) return;

        try {
            const response = await fetch('/api/chat/clarify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, answers })
            });

            if (!response.ok) {
                throw new Error('Failed to submit clarification');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [sessionId]);

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return { initSession, submitClarification, messages, state, sessionId, error, progress, rounds, currentRound };
}
