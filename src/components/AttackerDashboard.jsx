import { useState, useEffect } from 'react';
import { GameStatus } from '../hooks/useCyberSync';

function AttackerDashboard({ theme, onAttack, gameState }) {
    // Safety check - if theme is not valid, show loading
    if (!theme || !theme.tempo || !theme.ferramentas_ataque) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">⚔️</div>
                    <p className="text-emerald-400 font-mono">A carregar arsenal...</p>
                </div>
            </div>
        );
    }

    const [selectedTool, setSelectedTool] = useState(null);
    const [showLaunchAnimation, setShowLaunchAnimation] = useState(false);

    // Estados - canAttack = pronto para atacar, isWaiting = a aguardar resposta
    // No início da ronda, status é ATTACKING mas attackerTool é null -> Jogador DEVE atacar
    // Se status é ATTACKING e attackerTool existe -> Jogador JÁ atacou e espera defesa
    const canAttack = (gameState.gameStatus === GameStatus.ATTACKING || gameState.gameStatus === GameStatus.READY) && !gameState.attackerTool;
    const isWaitingResponse = gameState.gameStatus === GameStatus.ATTACKING && gameState.attackerTool;
    const isGameOver = gameState.gameStatus === GameStatus.DEFENDED || gameState.gameStatus === GameStatus.BREACHED;

    // Animação de lançamento
    const handleAttackClick = (tool) => {
        setSelectedTool(tool);
        setShowLaunchAnimation(true);

        setTimeout(() => {
            onAttack(tool.id);
            setShowLaunchAnimation(false);
        }, 1000);
    };

    // Pulsar quando a aguardar
    const [dots, setDots] = useState('');
    useEffect(() => {
        if (!isWaitingResponse) return;
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [isWaitingResponse]);

    return (
        <div className="min-h-screen bg-slate-950 cyber-grid relative overflow-hidden">
            {/* Launch Animation Overlay */}
            {showLaunchAnimation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                    <div className="text-center">
                        <div className="text-8xl mb-4 animate-bounce">🚀</div>
                        <h2 className="text-4xl font-orbitron font-black text-emerald-400 neon-text glitch">
                            LANÇANDO ATAQUE
                        </h2>
                        <p className="text-emerald-500/70 font-mono mt-2">{selectedTool?.nome}</p>
                        <div className="mt-6 flex justify-center gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 p-6">
                {/* Header com Score */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500 rounded-lg">
                            <span className="text-emerald-400 font-mono text-sm">⚔️ ATACANTE</span>
                        </div>
                        {gameState.roundNumber > 0 && (
                            <div className="px-3 py-1 bg-slate-800 rounded-full">
                                <span className="text-slate-400 font-mono text-xs">RONDA {gameState.roundNumber}</span>
                            </div>
                        )}
                    </div>

                    {/* Score Display */}
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-mono">TUA PONTUAÇÃO</p>
                            <p className="text-2xl font-orbitron font-bold text-emerald-400 score-display">
                                {gameState.myScore ?? gameState.attackerScore}
                            </p>
                        </div>
                        <div className="w-px h-10 bg-slate-700" />
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-mono">DEFENSOR</p>
                            <p className="text-2xl font-orbitron font-bold text-sky-400 score-display">
                                {gameState.defenderScore}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Theme Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-orbitron text-emerald-400 mb-2 neon-text">
                        {theme.titulo}
                    </h1>
                    <p className="text-slate-400 font-mono text-sm max-w-xl mx-auto">
                        "{theme.cenario}"
                    </p>
                    <div className="mt-4 inline-block px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg">
                        <span className="text-slate-500 font-mono text-xs">
                            ⏱️ O DEFENSOR TEM {theme.tempo} SEGUNDOS PARA RESPONDER
                        </span>
                    </div>
                </div>

                {/* Attack Tools */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-slate-300 font-mono text-center mb-6 text-sm uppercase tracking-wider flex items-center justify-center gap-3">
                        <span className="h-px w-12 bg-emerald-500/50" />
                        VETORES DE ATAQUE
                        <span className="h-px w-12 bg-emerald-500/50" />
                    </h2>
                    <div className="grid gap-3">
                        {theme.ferramentas_ataque.map((tool, index) => (
                            <button
                                key={tool.id}
                                onClick={() => handleAttackClick(tool)}
                                disabled={isWaitingResponse || isGameOver || showLaunchAnimation}
                                style={{ animationDelay: `${index * 100}ms` }}
                                className={`group w-full p-5 border-2 rounded-xl font-mono text-left transition-all duration-300 animate-[fadeIn_0.3s_ease-out_forwards] opacity-0 ${isWaitingResponse || isGameOver || showLaunchAnimation
                                    ? 'border-slate-700/50 text-slate-600 cursor-not-allowed bg-slate-900/30'
                                    : 'border-emerald-500/50 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] hover:scale-[1.02]'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-3">
                                        <span className="text-2xl">💀</span>
                                        <span className="text-lg">{tool.nome}</span>
                                    </span>
                                    {!isWaitingResponse && !isGameOver && (
                                        <span className="text-xs text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            EXECUTAR
                                            <span className="text-lg">→</span>
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Messages */}
                {isWaitingResponse && (
                    <div className="max-w-2xl mx-auto mt-10 text-center">
                        <div className="p-8 border-2 border-yellow-500/50 rounded-xl bg-yellow-500/5">
                            <div className="text-6xl mb-4 animate-pulse">⏳</div>
                            <p className="text-yellow-400 font-orbitron text-xl font-bold mb-2">
                                ATAQUE EM CURSO{dots}
                            </p>
                            <p className="text-slate-400 font-mono text-sm">
                                A aguardar resposta do sistema alvo
                            </p>
                            <div className="mt-6 flex justify-center gap-1">
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-2 h-6 bg-yellow-500/50 rounded animate-pulse"
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {gameState.gameStatus === 'DEFENDED' && (
                    <div className="max-w-2xl mx-auto mt-10 text-center">
                        <div className="p-8 border-2 border-sky-500 rounded-xl bg-sky-500/10 animate-[fadeIn_0.3s_ease-out]">
                            <div className="text-6xl mb-4">🛡️</div>
                            <p className="text-sky-400 font-orbitron font-bold text-2xl mb-2">
                                ATAQUE BLOQUEADO
                            </p>
                            <p className="text-slate-400 font-mono text-sm">O defensor neutralizou o ataque!</p>
                        </div>
                    </div>
                )}

                {gameState.gameStatus === 'BREACHED' && (
                    <div className="max-w-2xl mx-auto mt-10 text-center">
                        <div className="p-8 border-2 border-emerald-500 rounded-xl bg-emerald-500/10 animate-[fadeIn_0.3s_ease-out]">
                            <div className="text-6xl mb-4">🎯</div>
                            <p className="text-emerald-400 font-orbitron font-bold text-2xl mb-2">
                                SISTEMA COMPROMETIDO!
                            </p>
                            <p className="text-slate-400 font-mono text-sm">O ataque foi bem sucedido!</p>
                            <div className="mt-4 inline-block px-4 py-2 bg-emerald-500/20 rounded-lg">
                                <span className="text-emerald-300 font-mono text-sm">+{gameState.history?.slice(-1)[0]?.scoreGained || 150} pontos</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

export default AttackerDashboard;
