import { useState, useEffect } from 'react';

function FeedbackScreen({ theme, gameState, role, onPlayAgain }) {
    const [showContent, setShowContent] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [scoreAnimation, setScoreAnimation] = useState(0);

    // Safety check - if theme is not valid, show loading
    if (!theme || !theme.ferramentas_ataque || !theme.ferramentas_defesa) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">📊</div>
                    <p className="text-purple-400 font-mono">A carregar resultados...</p>
                    <button
                        onClick={onPlayAgain}
                        className="mt-6 px-6 py-3 bg-purple-600 text-white font-mono rounded-lg hover:bg-purple-500"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    const isDefended = gameState.gameStatus === 'DEFENDED';
    const lastRound = gameState.history?.slice(-1)[0];
    const playerWon = (role === 'defender' && isDefended) || (role === 'attacker' && !isDefended);

    // Encontrar a ferramenta correta
    const correctAttackTool = theme.ferramentas_ataque.find(t => t.correta);
    const correctDefenseTool = theme.ferramentas_defesa.find(t => t.correta);
    const usedDefenseTool = theme.ferramentas_defesa.find(t => t.id === gameState.defenderTool);

    // Animações sequenciais
    useEffect(() => {
        setTimeout(() => setShowContent(true), 500);
        setTimeout(() => setShowStats(true), 1000);
    }, []);

    // Animação de pontuação
    useEffect(() => {
        const targetScore = role === 'defender' ? gameState.defenderScore : gameState.attackerScore;
        const duration = 1500;
        const steps = 60;
        const increment = targetScore / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= targetScore) {
                setScoreAnimation(targetScore);
                clearInterval(timer);
            } else {
                setScoreAnimation(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [role, gameState.defenderScore, gameState.attackerScore]);

    return (
        <div className="min-h-screen bg-slate-950 cyber-grid relative overflow-hidden">
            {/* Victory/Defeat Particles Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {playerWon && [...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: 0,
                            backgroundColor: playerWon ? (role === 'defender' ? '#0ea5e9' : '#22c55e') : '#ef4444',
                            animation: `particle-rise ${2 + Math.random() * 2}s ease-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 p-6 max-w-4xl mx-auto">
                {/* Result Header */}
                <div className={`text-center mb-8 p-10 border-2 rounded-2xl transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    } ${playerWon
                        ? (role === 'defender' ? 'border-sky-500 bg-sky-500/10' : 'border-emerald-500 bg-emerald-500/10')
                        : 'border-red-500 bg-red-500/10'
                    }`}>
                    <div className={`text-8xl mb-4 ${playerWon ? 'animate-bounce' : 'animate-pulse'}`}>
                        {playerWon ? (role === 'defender' ? '🏆' : '💀') : '💔'}
                    </div>
                    <h1 className={`text-5xl font-orbitron font-black mb-3 neon-text ${playerWon
                        ? (role === 'defender' ? 'text-sky-400' : 'text-emerald-400')
                        : 'text-red-400'
                        }`}>
                        {playerWon ? 'VITÓRIA!' : 'DERROTA'}
                    </h1>
                    <p className="text-slate-300 font-mono text-lg">
                        {role === 'defender'
                            ? (isDefended ? 'Defendeste o sistema com sucesso!' : 'O atacante comprometeu o sistema.')
                            : (isDefended ? 'O defensor bloqueou o teu ataque.' : 'Ataque bem sucedido!')
                        }
                    </p>

                    {/* Score Gained This Round */}
                    {lastRound && (
                        <div className="mt-6 inline-block px-6 py-3 bg-slate-900/80 border border-slate-700 rounded-xl">
                            <span className="text-slate-400 font-mono text-sm">Esta ronda: </span>
                            <span className={`font-orbitron font-bold text-2xl ${playerWon ? 'text-yellow-400' : 'text-slate-500'}`}>
                                +{lastRound.scoreGained || (role === 'attacker' && !isDefended ? 150 : 0)} pts
                            </span>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                {showStats && (
                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                        {/* Total Score */}
                        <div className="p-6 bg-slate-900/80 border border-slate-700 rounded-xl text-center animate-[fadeIn_0.3s_ease-out]">
                            <p className="text-slate-500 font-mono text-xs uppercase mb-2">Pontuação Total</p>
                            <p className={`text-4xl font-orbitron font-bold score-display score-pop ${role === 'defender' ? 'text-sky-400' : 'text-emerald-400'
                                }`}>
                                {scoreAnimation}
                            </p>
                        </div>

                        {/* Response Time */}
                        <div className="p-6 bg-slate-900/80 border border-slate-700 rounded-xl text-center animate-[fadeIn_0.3s_ease-out]" style={{ animationDelay: '0.1s' }}>
                            <p className="text-slate-500 font-mono text-xs uppercase mb-2">Tempo de Resposta</p>
                            <p className="text-4xl font-orbitron font-bold text-purple-400">
                                {lastRound?.responseTime?.toFixed(1) || '—'}s
                            </p>
                        </div>

                        {/* Streak */}
                        <div className="p-6 bg-slate-900/80 border border-slate-700 rounded-xl text-center animate-[fadeIn_0.3s_ease-out]" style={{ animationDelay: '0.2s' }}>
                            <p className="text-slate-500 font-mono text-xs uppercase mb-2">Streak Atual</p>
                            <p className="text-4xl font-orbitron font-bold text-yellow-400">
                                {gameState.streak || 0}🔥
                            </p>
                        </div>
                    </div>
                )}

                {/* Educational Content */}
                {showStats && (
                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 mb-8 animate-[fadeIn_0.5s_ease-out]">
                        <h2 className="text-xl font-bold font-orbitron text-purple-400 mb-6 flex items-center gap-3">
                            <span className="text-2xl">📚</span>
                            Análise do Cenário
                        </h2>

                        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
                            <h3 className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">Cenário:</h3>
                            <p className="text-slate-300 font-mono text-sm italic">"{theme.cenario}"</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <h3 className="text-emerald-400 font-mono text-xs uppercase mb-3 flex items-center gap-2">
                                    <span>⚔️</span> Vetor de Ataque
                                </h3>
                                <p className="text-white font-orbitron font-bold text-lg mb-2">{correctAttackTool?.nome}</p>
                                <p className="text-slate-400 font-mono text-xs">
                                    Esta é a técnica principal usada neste tipo de ataque.
                                </p>
                            </div>

                            <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl">
                                <h3 className="text-sky-400 font-mono text-xs uppercase mb-3 flex items-center gap-2">
                                    <span>🛡️</span> Defesa Correta
                                </h3>
                                <p className="text-white font-orbitron font-bold text-lg mb-2">{correctDefenseTool?.nome}</p>
                                {usedDefenseTool && usedDefenseTool.id !== correctDefenseTool?.id && (
                                    <p className="text-red-400 font-mono text-xs">
                                        ❌ Usaste: {usedDefenseTool.nome}
                                    </p>
                                )}
                                {usedDefenseTool && usedDefenseTool.id === correctDefenseTool?.id && (
                                    <p className="text-emerald-400 font-mono text-xs">
                                        ✅ Escolha correta!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Security Lesson */}
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <h3 className="text-yellow-400 font-mono text-xs uppercase mb-3 flex items-center gap-2">
                                <span>💡</span> Lição de Segurança
                            </h3>
                            <p className="text-slate-300 font-mono text-sm leading-relaxed">
                                {getSecurityLesson(theme.id)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {showStats && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[fadeIn_0.5s_ease-out]">
                        <button
                            onClick={onPlayAgain}
                            className="group px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-orbitron font-bold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-105"
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-xl">🔄</span>
                                JOGAR NOVAMENTE
                            </span>
                        </button>

                        {/* Match History Summary */}
                        {gameState.totalRounds > 1 && (
                            <div className="px-6 py-3 bg-slate-900/80 border border-slate-700 rounded-xl">
                                <span className="text-slate-400 font-mono text-sm">
                                    Total: {gameState.totalRounds} rondas •
                                    Atacante: {gameState.attackerScore} pts •
                                    Defensor: {gameState.defenderScore} pts
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
      `}</style>
        </div>
    );
}

// Lições de segurança por tema
function getSecurityLesson(themeId) {
    const lessons = {
        tailgating: "Nunca permitas que alguém entre nas instalações atrás de ti sem verificar a identificação. Cada pessoa deve usar o seu próprio cartão de acesso. Esta técnica de engenharia social explora a cortesia natural das pessoas.",
        phishing: "Antes de clicar em qualquer link, verifica sempre o URL real passando o rato por cima. Emails urgentes de entidades oficiais devem ser sempre verificados através de canais oficiais.",
        hack_rede: "Um Sistema de Deteção de Intrusões (IDS) monitoriza o tráfego de rede em tempo real e alerta sobre atividades suspeitas como varreduras de portas.",
        roubo_informacao: "Nunca ligues dispositivos USB desconhecidos ao computador. Podem conter malware projetado para roubar informações ou assumir o controlo do sistema.",
        clone_cartao: "Pagamentos contactless são mais seguros pois usam tokenização - os dados reais do cartão nunca são expostos ao terminal de pagamento.",
        deepweb: "A educação e consciencialização são a primeira linha de defesa. Saber identificar conteúdos perigosos e evitar sites suspeitos protege-te de muitas ameaças.",
        carregar_link: "Smishing (phishing por SMS) é cada vez mais comum. Verifica sempre o remetente e nunca cliques em links de mensagens não solicitadas.",
        descarregar: "Atenção às extensões de ficheiros! Um ficheiro .pdf.exe não é um PDF - é um executável disfarçado que pode conter malware.",
        controlo_remoto: "Mantém a firewall sempre ativa. Ela bloqueia conexões não autorizadas que trojans como RATs usam para controlar remotamente o computador.",
        roubo_identidade: "A autenticação de dois fatores (2FA) adiciona uma camada extra de proteção. Mesmo que roubem a tua password, precisam do segundo fator para aceder.",
        fake_news: "Verificação de factos é essencial. Antes de acreditar ou partilhar informação, confirma em múltiplas fontes confiáveis e verifica a origem da notícia."
    };
    return lessons[themeId] || "Mantém-te sempre alerta e segue as boas práticas de cibersegurança para proteger os teus dados e sistemas.";
}

export default FeedbackScreen;
