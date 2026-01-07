import { useState, useEffect } from 'react';
import cenarios from '../data/cenarios.json';

function EntryScreen({ onStart }) {
    const [role, setRole] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [showContent, setShowContent] = useState(false);
    const [typingText, setTypingText] = useState('');

    const fullText = 'SISTEMA DE TREINO DE CIBERSEGURANÇA v2.0';

    // Typing animation
    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            if (index <= fullText.length) {
                setTypingText(fullText.slice(0, index));
                index++;
            } else {
                clearInterval(timer);
                setTimeout(() => setShowContent(true), 300);
            }
        }, 50);
        return () => clearInterval(timer);
    }, []);

    const handleStart = () => {
        if (role && selectedTheme) {
            onStart(role, selectedTheme);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 cyber-grid scanline relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent"
                        style={{
                            left: `${Math.random() * 100}%`,
                            height: `${100 + Math.random() * 200}px`,
                            animation: `matrix-fall ${3 + Math.random() * 4}s linear infinite`,
                            animationDelay: `${Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
                {/* Terminal Window Effect */}
                <div className="terminal-window rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/30 pb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-slate-500 text-xs ml-2 font-mono">cyber_siege_terminal</span>
                    </div>
                    <p className="text-emerald-400 font-mono text-sm text-left">
                        <span className="text-slate-500">$</span> {typingText}
                        <span className="animate-pulse">_</span>
                    </p>
                </div>

                <h1
                    className="text-6xl md:text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 mb-3 neon-text glitch-text"
                    data-text="CYBER SIEGE"
                >
                    CYBER SIEGE
                </h1>
                <p className="text-slate-400 font-mono text-sm tracking-[0.5em] uppercase">O Protocolo Final</p>

                {/* Decorative Line */}
                <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="h-px w-20 bg-gradient-to-r from-transparent to-emerald-500" />
                    <div className="w-2 h-2 bg-emerald-500 rotate-45 animate-pulse" />
                    <div className="h-px w-20 bg-gradient-to-l from-transparent to-emerald-500" />
                </div>
            </div>

            {showContent && (
                <div className="w-full max-w-4xl relative z-10 animate-[fadeIn_0.5s_ease-out]">
                    {/* Role Selection */}
                    <div className="mb-8">
                        <h2 className="text-slate-300 font-mono text-center mb-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                            <span className="text-emerald-400">▸</span>
                            Seleciona o teu papel
                            <span className="text-emerald-400">◂</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => setRole('attacker')}
                                className={`group relative p-8 border-2 rounded-xl font-mono transition-all duration-300 cyber-btn overflow-hidden ${role === 'attacker'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                                        : 'border-slate-700 text-slate-400 hover:border-emerald-500/50'
                                    }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 transition-opacity ${role === 'attacker' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                                <div className="relative">
                                    <div className="text-5xl mb-3 float">⚔️</div>
                                    <div className="text-xl font-bold font-orbitron">ATACANTE</div>
                                    <p className="text-xs text-slate-500 mt-2">Explora vulnerabilidades</p>
                                    {role === 'attacker' && (
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
                                    )}
                                </div>
                            </button>

                            <button
                                onClick={() => setRole('defender')}
                                className={`group relative p-8 border-2 rounded-xl font-mono transition-all duration-300 cyber-btn overflow-hidden ${role === 'defender'
                                        ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]'
                                        : 'border-slate-700 text-slate-400 hover:border-sky-500/50'
                                    }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br from-sky-500/20 to-transparent opacity-0 transition-opacity ${role === 'defender' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                                <div className="relative">
                                    <div className="text-5xl mb-3 float">🛡️</div>
                                    <div className="text-xl font-bold font-orbitron">DEFENSOR</div>
                                    <p className="text-xs text-slate-500 mt-2">Protege a infraestrutura</p>
                                    {role === 'defender' && (
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-sky-500 rounded-full animate-ping" />
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Theme Selection */}
                    <div className="mb-8">
                        <h2 className="text-slate-300 font-mono text-center mb-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                            <span className="text-purple-400">▸</span>
                            Seleciona o cenário de ataque
                            <span className="text-purple-400">◂</span>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-2 scrollbar-thin">
                            {cenarios.temas.map((tema, index) => (
                                <button
                                    key={tema.id}
                                    onClick={() => setSelectedTheme(tema)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`group p-4 border-2 rounded-lg font-mono text-sm transition-all duration-300 text-left cyber-card animate-[fadeIn_0.3s_ease-out_forwards] opacity-0 ${selectedTheme?.id === tema.id
                                            ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                            : 'border-slate-700/50 text-slate-400 hover:border-purple-500/50 hover:bg-slate-900/50'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">{getThemeIcon(tema.id)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate text-xs">{tema.titulo}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">⏱️ {tema.tempo}s</p>
                                        </div>
                                    </div>
                                    {selectedTheme?.id === tema.id && (
                                        <div className="mt-2 pt-2 border-t border-purple-500/30">
                                            <span className="text-[10px] text-purple-400">✓ SELECIONADO</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Theme Info */}
                    {selectedTheme && (
                        <div className="mb-8 p-5 border border-slate-700 rounded-xl bg-slate-900/80 backdrop-blur animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">{getThemeIcon(selectedTheme.id)}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-purple-400 font-orbitron mb-1">{selectedTheme.titulo}</h3>
                                    <p className="text-slate-400 font-mono text-sm italic leading-relaxed">
                                        "{selectedTheme.cenario}"
                                    </p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                                            ⏱️ {selectedTheme.tempo}s limite
                                        </span>
                                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                                            🎯 5 opções
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Start Button */}
                    <div className="text-center">
                        <button
                            onClick={handleStart}
                            disabled={!role || !selectedTheme}
                            className={`group relative px-16 py-5 font-orbitron font-bold text-lg rounded-xl transition-all duration-300 overflow-hidden ${role && selectedTheme
                                    ? 'bg-gradient-to-r from-emerald-600 via-cyan-500 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] scale-100 hover:scale-105'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            {role && selectedTheme && (
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 opacity-0 group-hover:opacity-30 transition-opacity" />
                            )}
                            <span className="relative flex items-center gap-3">
                                <span className="text-2xl">{role === 'attacker' ? '⚔️' : role === 'defender' ? '🛡️' : '🎮'}</span>
                                INICIAR MISSÃO
                                <span className="text-2xl">→</span>
                            </span>
                        </button>

                        {/* Status */}
                        {role && selectedTheme && (
                            <p className="text-slate-500 font-mono text-xs mt-4 animate-pulse">
                                [ {role === 'attacker' ? 'ATACANTE' : 'DEFENSOR'} ] • [ {selectedTheme.titulo.toUpperCase()} ]
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Keyframes for fade in */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

// Ícones para cada tema
function getThemeIcon(themeId) {
    const icons = {
        tailgating: '🚪',
        phishing: '🎣',
        hack_rede: '🌐',
        roubo_informacao: '💾',
        clone_cartao: '💳',
        deepweb: '🕸️',
        carregar_link: '🔗',
        descarregar: '📥',
        controlo_remoto: '🖥️',
        roubo_identidade: '👤',
        fake_news: '📰'
    };
    return icons[themeId] || '🔒';
}

export default EntryScreen;
