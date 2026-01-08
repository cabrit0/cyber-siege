import { useState, useEffect } from 'react';
import cenarios from '../data/cenarios.json';

// Gerar código de sala curto (4 caracteres)
const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 1, 0 para evitar confusão
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// function EntryScreen update signature
function EntryScreen({ onStart, onJoin, playedThemes = [], currentSessionId = null, canSelect = true, initialRole = null, globalWinner = null, finalScores = null, myUserId = null }) {
    const [role, setRole] = useState(initialRole);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [showContent, setShowContent] = useState(!!currentSessionId);
    const [typingText, setTypingText] = useState('');
    // Room Logic
    const [roomMode, setRoomMode] = useState('create'); // 'create' | 'join'
    const [roomId, setRoomId] = useState(currentSessionId || '');
    const [generatedId, setGeneratedId] = useState('');

    const fullText = 'SISTEMA DE TREINO DE CIBERSEGURANÇA v2.0';

    // Gerar ID inicial
    useEffect(() => {
        setGeneratedId(generateRoomId());
    }, []);

    // Typing animation logic removed for brevity (kept same)

    useEffect(() => {
        if (currentSessionId) {
            setShowContent(true);
            return;
        }
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
    }, [currentSessionId]);

    const handleStart = () => {
        // BUG FIX: Se já temos sessão (Theme 2+), usar esse ID. Se não, usar gerado ou input.
        const finalRoomId = currentSessionId || (roomMode === 'create' ? generatedId : roomId.toUpperCase());

        if (roomMode === 'create' || currentSessionId) {
            if (role && selectedTheme && finalRoomId) {
                onStart(role, selectedTheme, finalRoomId);
            }
        } else {
            // Join Mode
            if (finalRoomId && finalRoomId.length === 4) {
                onJoin(finalRoomId);
            }
        }
    };

    const isRoomIdValid = roomMode === 'create' || (roomId.length === 4);

    // ... (Game Over logic remains same)
    const allThemesPlayed = cenarios.temas.every(t => playedThemes.includes(t.id));

    // Verificação autoritativa do servidor OU local (fallback)
    const isGameFinished = (playedThemes.length >= 11) || allThemesPlayed;

    if (isGameFinished) {
        const iAmWinner = globalWinner === myUserId;
        const resultMessage = iAmWinner
            ? "PARABÉNS! DEMONSTRAS-TE SER UM VERDADEIRO ESPECIALISTA EM CIBERSEGURANÇA."
            : "PRECISAS DE TREINO! O TEU ADVERSÁRIO ESTEVE MELHOR PREPARADO.";

        const encouragement = iAmWinner
            ? "A tua consciência de segurança é um exemplo."
            : "A cibersegurança exige vigilância constante. Tenta de novo!";

        return (
            <div className="min-h-screen bg-slate-950 text-white font-mono flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-bounce text-6xl mb-6">{iAmWinner ? '🏆' : '⚠️'}</div>
                <h1 className="text-4xl md:text-6xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
                    {iAmWinner ? "MESTRE DA CIBERSEGURANÇA" : "MISSÃO FALHADA"}
                </h1>
                <div className="bg-slate-900/80 p-8 rounded-2xl border border-purple-500/30 mb-8 max-w-md w-full">
                    <p className="text-slate-400 mb-4 uppercase tracking-widest text-xs">Relatório Final</p>
                    <p className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed">{resultMessage}</p>
                    <p className="text-slate-300 italic text-sm">{encouragement}</p>

                    {/* Exibir Scores se disponíveis */}
                    {finalScores && (
                        <div className="mt-6 pt-6 border-t border-slate-700">
                            <div className="flex justify-between text-sm font-mono mb-2">
                                <span className={iAmWinner ? "text-emerald-400 font-bold" : "text-slate-400"}>TU</span>
                                <span className={!iAmWinner ? "text-emerald-400 font-bold" : "text-slate-400"}>ADVERSÁRIO</span>
                            </div>
                            <div className="flex justify-between text-xl font-orbitron">
                                <span>{finalScores[myUserId] || 0}</span>
                                <span>{Object.entries(finalScores).find(([id]) => id !== myUserId)?.[1] || 0}</span>
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                    INICIAR NOVA SESSÃO
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 cyber-grid scanline relative overflow-hidden">
            {/* Background elements kept */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" style={{ left: `${Math.random() * 100}%`, height: `${100 + Math.random() * 200}px`, animation: `matrix-fall ${3 + Math.random() * 4}s linear infinite`, animationDelay: `${Math.random() * 3}s` }} />
                ))}
            </div>

            {/* Header kept */}
            <div className="text-center mb-8 relative z-10">
                <div className="terminal-window rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/30 pb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-slate-500 text-xs ml-2 font-mono">cyber_siege_terminal</span>
                    </div>
                    <p className="text-emerald-400 font-mono text-sm text-left">
                        <span className="text-slate-500">$</span> {typingText}<span className="animate-pulse">_</span>
                    </p>
                </div>
                <h1 className="text-6xl md:text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 mb-3 neon-text glitch-text" data-text="CYBER SIEGE">CYBER SIEGE</h1>
                <p className="text-slate-400 font-mono text-sm tracking-[0.5em] uppercase">O Protocolo Final</p>
                <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="h-px w-20 bg-gradient-to-r from-transparent to-emerald-500" />
                    <div className="w-2 h-2 bg-emerald-500 rotate-45 animate-pulse" />
                    <div className="h-px w-20 bg-gradient-to-l from-transparent to-emerald-500" />
                </div>
            </div>

            {showContent && (
                <div className="w-full max-w-4xl relative z-10 animate-[fadeIn_0.5s_ease-out]">
                    {/* OVERLAY DE BLOQUEIO */}
                    {!canSelect && currentSessionId && (
                        <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm rounded-xl border border-slate-800 animate-[fadeIn_0.5s_ease-out]">
                            <div className="w-16 h-16 mb-6 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin"></div>
                            <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">A AGUARDAR</h2>
                            <p className="text-slate-400 font-mono text-center max-w-md leading-relaxed">O vencedor da última ronda está a escolher o próximo desafio e a definir os papéis táticos. Prepare-se.</p>
                            <div className="mt-8 px-6 py-3 bg-slate-900/80 rounded-full border border-slate-700 animate-pulse"><p className="text-xs text-emerald-500 font-mono tracking-widest">● CONEXÃO ESTÁVEL</p></div>
                        </div>
                    )}

                    {/* Header with Room ID logic kept */}
                    <div className="flex justify-between items-end mb-8 border-b border-purple-500/30 pb-4">
                        <div>
                            <h1 className="text-4xl md:text-6xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">CYBER SIEGE</h1>
                            <p className="text-purple-300/60 font-mono text-sm tracking-widest mt-2">{roomMode === 'create' ? 'MODO CRIAÇÃO DE SALA' : 'MODO ENTRADA EM SALA'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-purple-400 font-mono tracking-widest mb-1">{currentSessionId ? 'SESSÃO ATIVA' : 'SESSÃO INICIADA'}</p>
                            <div className="flex items-center justify-end gap-2 text-white font-orbitron">
                                <span className="text-2xl font-bold tracking-wider">{roomId}</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                            </div>
                        </div>
                    </div>

                    {/* Room Configuration Block */}
                    {!currentSessionId && (
                        <div className="mb-8 p-6 border-2 border-slate-700 bg-slate-900/80 rounded-xl backdrop-blur-sm">
                            <h2 className="text-slate-300 font-mono text-center mb-6 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                <span className="text-yellow-400">▸</span> Configuração de Conexão <span className="text-yellow-400">◂</span>
                            </h2>
                            <div className="flex justify-center gap-4 mb-6">
                                <button onClick={() => setRoomMode('create')} className={`px-6 py-2 rounded-lg font-mono text-sm transition-all ${roomMode === 'create' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}>CRIAR NOVA SALA</button>
                                <div className="w-px bg-slate-700 mx-2" />
                                <button onClick={() => setRoomMode('join')} className={`px-6 py-2 rounded-lg font-mono text-sm transition-all ${roomMode === 'join' ? 'bg-sky-500/20 text-sky-400 border border-sky-500' : 'text-slate-500 hover:text-slate-300'}`}>ENTRAR EM SALA</button>
                            </div>

                            <div className="flex flex-col items-center justify-center">
                                {roomMode === 'create' ? (
                                    <div className="text-center animate-[fadeIn_0.3s_ease-out]">
                                        <p className="text-slate-400 text-xs mb-2 font-mono">O TEU CÓDIGO DE SALA:</p>
                                        <div className="text-5xl font-orbitron font-bold text-emerald-400 tracking-widest bg-black/30 px-8 py-4 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">{generatedId}</div>
                                        <p className="text-slate-500 text-xs mt-3 font-mono">Partilha este código com o outro jogador</p>
                                    </div>
                                ) : (
                                    <div className="text-center animate-[fadeIn_0.3s_ease-out]">
                                        <p className="text-slate-400 text-xs mb-2 font-mono">INTRODUZ O CÓDIGO DA SALA:</p>
                                        <input type="text" maxLength={4} value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} placeholder="____" className="text-5xl font-orbitron font-bold text-sky-400 tracking-widest bg-black/50 px-8 py-4 rounded-xl border-2 border-slate-600 focus:border-sky-500 outline-none text-center w-64 shadow-inner placeholder-slate-800 transition-all uppercase" />
                                        <p className="text-slate-500 text-xs mt-3 font-mono">Pede o código ao criador da sala</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SELETORES APENAS EM MODO CREATE */}
                    {roomMode === 'create' && (
                        <>
                            {/* Role Selection */}
                            <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
                                <h2 className="text-slate-300 font-mono text-center mb-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2"><span className="text-emerald-400">▸</span> Seleciona o teu papel <span className="text-emerald-400">◂</span></h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <button onClick={() => setRole('attacker')} className={`group relative p-8 border-2 rounded-xl font-mono transition-all duration-300 cyber-btn overflow-hidden ${role === 'attacker' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'border-slate-700 text-slate-400 hover:border-emerald-500/50'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 transition-opacity ${role === 'attacker' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                                        <div className="relative"><div className="text-5xl mb-3 float">⚔️</div><div className="text-xl font-bold font-orbitron">ATACANTE</div><p className="text-xs text-slate-500 mt-2">Explora vulnerabilidades</p>{role === 'attacker' && <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />}</div>
                                    </button>
                                    <button onClick={() => setRole('defender')} className={`group relative p-8 border-2 rounded-xl font-mono transition-all duration-300 cyber-btn overflow-hidden ${role === 'defender' ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]' : 'border-slate-700 text-slate-400 hover:border-sky-500/50'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-sky-500/20 to-transparent opacity-0 transition-opacity ${role === 'defender' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                                        <div className="relative"><div className="text-5xl mb-3 float">🛡️</div><div className="text-xl font-bold font-orbitron">DEFENSOR</div><p className="text-xs text-slate-500 mt-2">Protege a infraestrutura</p>{role === 'defender' && <div className="absolute -top-2 -right-2 w-4 h-4 bg-sky-500 rounded-full animate-ping" />}</div>
                                    </button>
                                </div>
                            </div>
                            {/* Theme Selection */}
                            <div className="mb-8 animate-[fadeIn_0.5s_ease-out]">
                                <h2 className="text-slate-300 font-mono text-center mb-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2"><span className="text-purple-400">▸</span> Seleciona o cenário de ataque <span className="text-purple-400">◂</span></h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-2 scrollbar-thin">
                                    {cenarios.temas.map((tema, index) => {
                                        const isPlayed = playedThemes.includes(tema.id);
                                        return (
                                            <button key={tema.id} onClick={() => setSelectedTheme(tema)} disabled={isPlayed} style={{ animationDelay: `${index * 50}ms` }} className={`group p-4 border-2 rounded-lg font-mono text-sm transition-all duration-300 text-left cyber-card animate-[fadeIn_0.3s_ease-out_forwards] opacity-0 ${selectedTheme?.id === tema.id ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : isPlayed ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed opacity-50' : 'border-slate-700/50 text-slate-400 hover:border-purple-500/50 hover:bg-slate-900/50'}`}>
                                                <div className="flex items-start gap-2"><span className="text-lg">{isPlayed ? '🔒' : getThemeIcon(tema.id)}</span><div className="flex-1 min-w-0"><p className={`font-semibold truncate text-xs ${isPlayed ? 'line-through' : ''}`}>{tema.titulo}</p><p className="text-[10px] text-slate-500 mt-1">{isPlayed ? 'COMPLETADO' : `⏱️ ${tema.tempo}s`}</p></div></div>
                                                {selectedTheme?.id === tema.id && <div className="mt-2 pt-2 border-t border-purple-500/30"><span className="text-[10px] text-purple-400">✓ SELECIONADO</span></div>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            {/* Selected Theme Info */}
                            {selectedTheme && (
                                <div className="mb-8 p-5 border border-slate-700 rounded-xl bg-slate-900/80 backdrop-blur animate-[fadeIn_0.3s_ease-out]">
                                    <div className="flex items-start gap-4"><div className="text-4xl">{getThemeIcon(selectedTheme.id)}</div><div className="flex-1"><h3 className="text-lg font-bold text-purple-400 font-orbitron mb-1">{selectedTheme.titulo}</h3><p className="text-slate-400 font-mono text-sm italic leading-relaxed">"{selectedTheme.cenario}"</p>
                                        <div className="flex items-center gap-4 mt-3"><span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">⏱️ {selectedTheme.tempo}s limite</span><span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">🎯 5 opções</span></div></div></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Start Button */}
                    <div className="text-center">
                        <button
                            onClick={handleStart}
                            disabled={roomMode === 'create' ? (!role || !selectedTheme || !isRoomIdValid) : !isRoomIdValid}
                            className={`group relative px-16 py-5 font-orbitron font-bold text-lg rounded-xl transition-all duration-300 overflow-hidden ${(roomMode === 'create' ? (role && selectedTheme && isRoomIdValid) : isRoomIdValid)
                                ? 'bg-gradient-to-r from-emerald-600 via-cyan-500 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] scale-100 hover:scale-105'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            {(roomMode === 'create' ? (role && selectedTheme && isRoomIdValid) : isRoomIdValid) && (
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 opacity-0 group-hover:opacity-30 transition-opacity" />
                            )}
                            <span className="relative flex items-center gap-3">
                                {roomMode === 'create' && <span className="text-2xl">{role === 'attacker' ? '⚔️' : role === 'defender' ? '🛡️' : '🎮'}</span>}
                                {roomMode === 'create' ? 'INICIAR MISSÃO' : 'ENTRAR NA MISSÃO'}
                                <span className="text-2xl">→</span>
                            </span>
                        </button>
                    </div>
                </div>
            )}
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
