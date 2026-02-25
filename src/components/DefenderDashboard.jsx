import { useState, useEffect, useRef } from 'react';
import { GameStatus } from '../hooks/useCyberSync';

function DefenderDashboard({ theme, onDefend, gameState, onTimeExpired }) {
    // Safety check - if theme is not valid, show loading
    if (!theme || !theme.tempo || !theme.ferramentas_defesa) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">🛡️</div>
                    <p className="text-sky-400 font-mono">A carregar defesas...</p>
                </div>
            </div>
        );
    }

    const [timeLeft, setTimeLeft] = useState(theme.tempo);
    const [showAttackAlert, setShowAttackAlert] = useState(false);
    const attackStartedRef = useRef(false);

    // Estados do jogo
    const isWaiting = gameState.gameStatus === GameStatus.READY || gameState.gameStatus === GameStatus.LOBBY;
    // O ataque só é visível para o defensor quando o atacante já escolheu a ferramenta
    const isUnderAttack = gameState.gameStatus === GameStatus.ATTACKING && gameState.attackerTool;
    const isGameOver = gameState.gameStatus === GameStatus.DEFENDED || gameState.gameStatus === GameStatus.BREACHED;


    // Mostrar alerta dramático quando ataque começa
    useEffect(() => {
        if (isUnderAttack && !isGameOver && !attackStartedRef.current) {
            attackStartedRef.current = true;
            setShowAttackAlert(true);
            const timeout = setTimeout(() => setShowAttackAlert(false), 2000);
            return () => clearTimeout(timeout);
        }
        if (!isUnderAttack) {
            attackStartedRef.current = false;
        }
    }, [isUnderAttack, isGameOver]);

    // Timer countdown
    useEffect(() => {
        if (!isUnderAttack || isGameOver) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onTimeExpired();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isUnderAttack, isGameOver, onTimeExpired]);

    // Reset timer when attack starts
    useEffect(() => {
        if (isUnderAttack && !isGameOver) {
            setTimeLeft(theme.tempo);
        }
    }, [isUnderAttack, isGameOver, theme.tempo]);

    const handleDefend = (tool) => {
        onDefend(tool.id, tool.correta, timeLeft);
    };

    const progressPercent = (timeLeft / theme.tempo) * 100;
    const isUrgent = timeLeft <= 5;
    const isCritical = timeLeft <= 3;

    // Encontrar a ferramenta atacante
    const attackTool = theme.ferramentas_ataque.find(t => t.id === gameState.attackerTool);

    return (
        <div className={`min-h-screen bg-slate-950 cyber-grid relative overflow-hidden ${isUnderAttack && !isGameOver ? 'danger-flash' : ''}`}>
            {/* Scanline effect when under attack */}
            {isUnderAttack && !isGameOver && <div className="scanline" />}

            {/* Red Alert Overlay */}
            {isUnderAttack && !isGameOver && (
                <div className="fixed inset-0 pointer-events-none z-10">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent animate-pulse" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                </div>
            )}

            {/* Dramatic Attack Alert Overlay */}
            {showAttackAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-[fadeIn_0.1s_ease-out]">
                    <div className="text-center glitch">
                        <div className="text-8xl mb-4 animate-bounce">🚨</div>
                        <h2 className="text-5xl font-orbitron font-black text-red-500 neon-text mb-2">
                            INTRUSÃO DETETADA
                        </h2>
                        <p className="text-xl text-red-400 font-mono animate-pulse">
                            AMEAÇA: {attackTool?.nome || 'DESCONHECIDA'}
                        </p>
                    </div>
                </div>
            )}

            <div className="relative z-20 p-6">
                {/* Header com Score */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-sky-500/20 border border-sky-500 rounded-lg">
                            <span className="text-sky-400 font-mono text-sm">🛡️ DEFENSOR</span>
                        </div>
                        {gameState.streak > 0 && (
                            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded-full animate-pulse">
                                <span className="text-yellow-400 font-mono text-xs">🔥 {gameState.streak}x STREAK</span>
                            </div>
                        )}
                    </div>

                    {/* Score Display */}
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-mono">TUA PONTUAÇÃO</p>
                            <p className="text-2xl font-orbitron font-bold text-sky-400 score-display">
                                {gameState.myScore ?? gameState.defenderScore}
                            </p>
                        </div>
                        <div className="w-px h-10 bg-slate-700" />
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-mono">ATACANTE</p>
                            <p className="text-2xl font-orbitron font-bold text-emerald-400 score-display">
                                {gameState.attackerScore}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Theme Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold font-orbitron text-sky-400 mb-2">
                        {theme.titulo}
                    </h1>
                    <p className="text-slate-400 font-mono text-sm max-w-xl mx-auto">
                        "{theme.cenario}"
                    </p>
                </div>

                {/* Timer */}
                {isUnderAttack && !isGameOver && (
                    <div className={`max-w-2xl mx-auto mb-6 ${isCritical ? 'critical-timer shake' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 font-mono text-sm flex items-center gap-2">
                                ⏱️ TEMPO RESTANTE
                            </span>
                            <span className={`font-orbitron font-bold text-4xl ${isCritical ? 'text-red-500' : isUrgent ? 'text-yellow-400' : 'text-sky-400'
                                } ${isUrgent ? 'countdown-pulse' : ''}`}>
                                {timeLeft}
                            </span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : isUrgent ? 'bg-yellow-500' : 'bg-gradient-to-r from-sky-500 to-emerald-500'
                                    } ${!isCritical && !isUrgent ? 'progress-glow' : ''}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                            {isCritical && (
                                <div className="absolute inset-0 bg-red-500/30 animate-pulse" />
                            )}
                        </div>
                        {isUrgent && (
                            <p className="text-center text-red-400 font-mono text-xs mt-2 animate-pulse">
                                ⚠️ TEMPO A ESGOTAR! DECIDE AGORA!
                            </p>
                        )}
                    </div>
                )}

                {/* Attack Info */}
                {isUnderAttack && !isGameOver && attackTool && (
                    <div className="max-w-2xl mx-auto mb-6 p-4 border-2 border-red-500/50 rounded-lg bg-red-500/5">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl animate-pulse">⚠️</div>
                            <div>
                                <p className="text-red-400 font-mono text-sm">ATAQUE EM CURSO</p>
                                <p className="text-white font-orbitron font-bold">{attackTool.nome}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Waiting State */}
                {!isUnderAttack && !isGameOver && (
                    <div className="max-w-2xl mx-auto mb-8 text-center p-12 border-2 border-slate-700 rounded-xl bg-slate-900/50">
                        <div className="text-6xl mb-4 spin-slow">👁️</div>
                        <p className="text-slate-300 font-orbitron text-xl mb-2">MONITORIZAÇÃO ATIVA</p>
                        <p className="text-slate-500 font-mono text-sm">A analisar tráfego de rede...</p>
                        <div className="mt-6 flex justify-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-2 h-8 bg-sky-500/30 rounded animate-pulse"
                                    style={{ animationDelay: `${i * 0.2}s` }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Defense Tools */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-slate-300 font-mono text-center mb-6 text-sm uppercase tracking-wider flex items-center justify-center gap-3">
                        <span className="h-px w-12 bg-sky-500/50" />
                        FERRAMENTAS DE DEFESA
                        <span className="h-px w-12 bg-sky-500/50" />
                    </h2>
                    <div className="grid gap-3">
                        {theme.ferramentas_defesa.map((tool, index) => (
                            <button
                                key={tool.id}
                                onClick={() => handleDefend(tool)}
                                disabled={!isUnderAttack || isGameOver}
                                style={{ animationDelay: `${index * 100}ms` }}
                                className={`group w-full p-5 border-2 rounded-xl font-mono text-left transition-all duration-300 animate-[fadeIn_0.3s_ease-out_forwards] opacity-0 ${!isUnderAttack || isGameOver
                                    ? 'border-slate-700/50 text-slate-600 cursor-not-allowed bg-slate-900/30'
                                    : 'border-sky-500/50 text-sky-400 hover:border-sky-400 hover:bg-sky-500/10 hover:shadow-[0_0_30px_rgba(14,165,233,0.2)] hover:scale-[1.02]'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-3">
                                        <span className="text-2xl">🔧</span>
                                        <span className="text-lg">{tool.nome}</span>
                                    </span>
                                    {isUnderAttack && !isGameOver && (
                                        <span className="text-xs text-sky-500 opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            ATIVAR
                                            <span className="text-lg">→</span>
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Round Info */}
                <div className="max-w-2xl mx-auto mt-8 text-center">
                    <p className="text-slate-600 font-mono text-xs">
                        RONDA {gameState.roundNumber || 1} • TEMA: {theme.id.toUpperCase()}
                    </p>
                </div>
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

export default DefenderDashboard;
