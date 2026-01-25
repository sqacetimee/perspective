'use client';

import { useState } from 'react';

interface AgentOutput {
    content: string;
    thinking?: boolean;
}

interface Round {
    number: number;
    agentA?: AgentOutput;
    agentB?: AgentOutput;
}

interface Props {
    rounds: Round[];
    currentRound: number;
    isProcessing: boolean;
}

export function AgentDebateViewer({ rounds, currentRound, isProcessing }: Props) {
    const [expanded, setExpanded] = useState(true);

    if (rounds.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Toggle Button */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
                <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                {expanded ? 'Hide Debate' : 'Show Live Debate'}
                {isProcessing && (
                    <span className="ml-2 flex gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                )}
            </button>

            {/* Debate Panels */}
            {expanded && (
                <div className="border border-gray-800 rounded-lg divide-y divide-gray-800 overflow-hidden">
                    {rounds.map((round) => (
                        <RoundPanel
                            key={round.number}
                            round={round}
                            isActive={round.number === currentRound && isProcessing}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function RoundPanel({ round, isActive }: { round: Round; isActive: boolean }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`transition-colors ${isActive ? 'bg-gray-900/70' : 'bg-gray-900/30'}`}>
            {/* Round Header */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-800/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
                        }`}>
                        Round {round.number}
                    </span>
                    {isActive && (
                        <span className="text-xs text-yellow-400 animate-pulse">● Live</span>
                    )}
                </div>
                <span className={`text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                    ▼
                </span>
            </button>

            {/* Round Content */}
            {!collapsed && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Agent A */}
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-400 text-xs font-bold">A</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-blue-400 mb-1 font-medium">Expansion Agent</div>
                            {round.agentA?.thinking ? (
                                <div className="text-gray-500 italic animate-pulse">
                                    Analyzing perspectives...
                                </div>
                            ) : round.agentA?.content ? (
                                <div className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap">
                                    {round.agentA.content}
                                </div>
                            ) : (
                                <div className="text-gray-600 italic">Waiting...</div>
                            )}
                        </div>
                    </div>

                    {/* Agent B */}
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <span className="text-purple-400 text-xs font-bold">B</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-purple-400 mb-1 font-medium">Compression Agent</div>
                            {round.agentB?.thinking ? (
                                <div className="text-gray-500 italic animate-pulse">
                                    Compressing to actionable insights...
                                </div>
                            ) : round.agentB?.content ? (
                                <div className="text-purple-100 text-sm leading-relaxed whitespace-pre-wrap">
                                    {round.agentB.content}
                                </div>
                            ) : (
                                <div className="text-gray-600 italic">Waiting...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
