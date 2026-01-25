'use client';

import { useState, useRef, useEffect } from 'react';
import { useMultiPerspectiveChat, ChatMessage } from '@/components/home/useMultiPerspectiveChat';
import { ProgressIndicator } from '@/components/chat/ProgressIndicator';
import { AgentDebateViewer } from '@/components/chat/AgentDebateViewer';

type SystemStatus = 'healthy' | 'degraded' | 'error';

export default function ChatPage() {
    const { initSession, submitClarification, messages, state, error, progress, rounds, currentRound } = useMultiPerspectiveChat();
    const [input, setInput] = useState('');
    const [clarificationInput, setClarificationInput] = useState('');
    const [systemStatus, setSystemStatus] = useState<SystemStatus>('healthy');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Poll health info
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setSystemStatus(data.status as SystemStatus);
            } catch (e) {
                setSystemStatus('error');
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, state]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        await initSession(input);
    };

    const handleClarify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clarificationInput.trim()) return;
        await submitClarification(clarificationInput);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-gray-800 pb-4 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Multi-Perspective AI
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Status: <span className="font-mono text-sm px-2 py-1 rounded bg-gray-900 border border-gray-700">{state}</span>
                        </p>
                    </div>

                    <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                        <div className={`w-3 h-3 rounded-full ${systemStatus === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                            systemStatus === 'degraded' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                                'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                            }`} />
                        <span className={`text-xs font-mono uppercase ${systemStatus === 'healthy' ? 'text-green-400' :
                            systemStatus === 'degraded' ? 'text-yellow-400' :
                                'text-red-400'
                            }`}>
                            {systemStatus}
                        </span>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
                        Error: {error}
                    </div>
                )}

                {/* Initial Input */}
                {state === 'INIT' && (
                    <form onSubmit={handleStart} className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-lg text-gray-300">What's on your mind?</label>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="w-full h-32 bg-gray-900 border border-gray-800 rounded p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Describe your situation..."
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
                        >
                            Start Analysis
                        </button>
                    </form>
                )}

                {/* Progress Indicator - Show during processing states */}
                {['INIT', 'CLARIFICATION_PENDING', 'CLARIFICATION_COMPLETE', 'ROUND_PROCESSING', 'SYNTHESIS_PROCESSING'].includes(state) && state !== 'COMPLETE' && (
                    <ProgressIndicator
                        stage={progress.stage || state.toLowerCase()}
                        percent={progress.percent || (state === 'CLARIFICATION_PENDING' ? 10 : state === 'ROUND_PROCESSING' ? 50 : 5)}
                        description={progress.description || `Status: ${state}`}
                    />
                )}

                {/* Agent Debate Viewer - Show during/after rounds */}
                {(state === 'ROUND_PROCESSING' || state === 'SYNTHESIS_PROCESSING' || state === 'COMPLETE') && (
                    <AgentDebateViewer
                        rounds={rounds}
                        currentRound={currentRound}
                        isProcessing={state !== 'COMPLETE'}
                    />
                )}

                {/* Chat Stream */}
                <div className="space-y-6">
                    {messages
                        .filter(msg => {
                            // Hide clarification questions after they are answered
                            if (msg.agent === 'CLARIFICATION' && state !== 'CLARIFICATION_PENDING') {
                                return false;
                            }
                            return true;
                        })
                        .map((msg, idx) => (
                            <MessageItem key={idx} message={msg} />
                        ))}

                    {/* Clarification Input Form */}
                    {state === 'CLARIFICATION_PENDING' && (
                        <div className="animate-fade-in space-y-4 border-t border-gray-800 pt-6">
                            <h3 className="text-xl text-yellow-400 font-semibold">Clarification Required</h3>
                            <p className="text-gray-400">Please answer the questions above to proceed.</p>
                            <form onSubmit={handleClarify} className="space-y-4">
                                <textarea
                                    value={clarificationInput}
                                    onChange={(e) => setClarificationInput(e.target.value)}
                                    className="w-full h-48 bg-gray-900 border border-yellow-900/50 rounded p-4 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                    placeholder="Your answers..."
                                    required
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded transition-colors"
                                >
                                    Submit Answers
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Loading Indicators */}
                    {(state === 'ROUND_PROCESSING' || state === 'SYNTHESIS_PROCESSING') && (
                        <div className="flex items-center space-x-2 text-gray-500 animate-pulse">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Processing...</span>
                        </div>
                    )}
                </div>

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function MessageItem({ message }: { message: ChatMessage }) {
    const isAgentA = message.agent === 'A';
    const isAgentB = message.agent === 'B';
    const isSynthesis = message.type === 'synthesis' || message.agent === 'SYNTHESIS';
    const isClarification = message.agent === 'CLARIFICATION';

    let borderColor = 'border-gray-800';
    let title = 'System';
    let textColor = 'text-gray-300';
    let bgColor = 'bg-gray-900/50';

    if (isAgentA) {
        borderColor = 'border-blue-500/50';
        title = `Round ${message.round} | Expansion Agent`;
        textColor = 'text-blue-100';
        bgColor = 'bg-blue-900/20';
    } else if (isAgentB) {
        borderColor = 'border-purple-500/50';
        title = `Round ${message.round} | Compression Agent`;
        textColor = 'text-purple-100';
        bgColor = 'bg-purple-900/20';
    } else if (isSynthesis) {
        borderColor = 'border-green-500';
        title = 'Final Synthesis';
        textColor = 'text-green-100';
        bgColor = 'bg-green-900/30';
    } else if (isClarification) {
        borderColor = 'border-yellow-500/50';
        title = 'Clarification Phase';
        textColor = 'text-yellow-100';
        bgColor = 'bg-yellow-900/20';
    }

    return (
        <div className={`border ${borderColor} rounded-lg p-6 ${bgColor} transition-all duration-300 hover:border-opacity-100`}>
            <div className="text-xs uppercase tracking-widest opacity-70 mb-2">{title}</div>
            <div className={`whitespace-pre-wrap ${textColor} leading-relaxed font-light`}>
                {message.content}
            </div>
        </div>
    );
}
