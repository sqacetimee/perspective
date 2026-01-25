'use client';

interface ProgressProps {
    stage: string;
    percent: number;
    description?: string;
}

const stageLabels: Record<string, string> = {
    'idle': 'Ready',
    'clarification_generating': 'Generating clarification questions...',
    'clarification_pending': 'Waiting for your answers...',
    'round_1_agent_a': 'Round 1: Agent A (Expansion) thinking...',
    'round_1_agent_b': 'Round 1: Agent B (Compression) responding...',
    'round_2_agent_a': 'Round 2: Agent A expanding...',
    'round_2_agent_b': 'Round 2: Agent B compressing...',
    'round_3_agent_a': 'Round 3: Agent A expanding...',
    'round_3_agent_b': 'Round 3: Agent B compressing...',
    'round_4_agent_a': 'Round 4: Agent A expanding...',
    'round_4_agent_b': 'Round 4: Agent B compressing...',
    'round_5_agent_a': 'Round 5: Final expansion...',
    'round_5_agent_b': 'Round 5: Final compression...',
    'synthesis': 'Synthesizing final perspective...',
    'complete': 'Analysis complete!'
};

export function ProgressIndicator({ stage, percent, description }: ProgressProps) {
    const label = description || stageLabels[stage] || stage;

    // Determine color based on stage
    const getGradient = () => {
        if (stage.includes('synthesis') || stage === 'complete') {
            return 'from-green-500 to-emerald-500';
        }
        if (stage.includes('agent_b')) {
            return 'from-purple-500 to-pink-500';
        }
        if (stage.includes('agent_a')) {
            return 'from-blue-500 to-cyan-500';
        }
        if (stage.includes('clarification')) {
            return 'from-yellow-500 to-orange-500';
        }
        return 'from-blue-500 to-purple-500';
    };

    return (
        <div className="w-full space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            {/* Stage Label */}
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 font-medium">{label}</span>
                <span className="text-blue-400 font-mono">{Math.round(percent)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${getGradient()} transition-all duration-700 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            {/* Round indicators */}
            <div className="flex justify-between px-1">
                {[1, 2, 3, 4, 5].map((round) => {
                    const roundPercent = 10 + (round - 1) * 16 + 16;
                    const isActive = percent >= (10 + (round - 1) * 16) && percent < roundPercent;
                    const isComplete = percent >= roundPercent;

                    return (
                        <div
                            key={round}
                            className={`text-xs font-mono transition-colors ${isComplete ? 'text-green-400' :
                                    isActive ? 'text-blue-400 animate-pulse' :
                                        'text-gray-600'
                                }`}
                        >
                            R{round}
                        </div>
                    );
                })}
                <div className={`text-xs font-mono ${percent >= 90 ? 'text-green-400' : 'text-gray-600'}`}>
                    ✓
                </div>
            </div>
        </div>
    );
}
