import { useEffect, useState } from 'react';

const formatPercent = (value) => {
    if (value == null || Number.isNaN(value)) return '--';
    return `${Math.round(value * 100)}%`;
};

const formatSeconds = (value) => {
    if (value == null || Number.isNaN(value)) return '--';
    return `${Number(value).toFixed(1)}s`;
};

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const polarPoint = (cx, cy, radius, angleDeg) => {
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: cx + Math.cos(angleRad) * radius,
        y: cy + Math.sin(angleRad) * radius
    };
};

const getShortId = (id) => {
    if (!id) return 'N/A';
    if (id.length <= 10) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

function buildThemeSummaries(history, playerIds, catalogById) {
    const themeOrder = [];
    const themes = new Map();

    history.forEach((round, index) => {
        const themeId = round?.themeId || `sem_tema_${index}`;
        if (!themes.has(themeId)) {
            themes.set(themeId, {
                themeId,
                themeName: round?.themeName || catalogById[themeId]?.titulo || `Tema ${themeOrder.length + 1}`,
                rounds: [],
                scores: {},
                winnerUserId: null
            });
            themeOrder.push(themeId);
        }

        const theme = themes.get(themeId);
        theme.rounds.push(round);

        if (round?.winnerUserId) {
            theme.scores[round.winnerUserId] = (theme.scores[round.winnerUserId] || 0) + (round.scoreGained || 0);
        }
    });

    return themeOrder.map((themeId) => {
        const theme = themes.get(themeId);
        let bestUserId = null;
        let bestScore = -1;

        Object.entries(theme.scores).forEach(([userId, score]) => {
            if (score > bestScore) {
                bestScore = score;
                bestUserId = userId;
            }
        });

        if (!bestUserId) {
            bestUserId = theme.rounds[theme.rounds.length - 1]?.winnerUserId || null;
        }

        theme.winnerUserId = bestUserId;

        playerIds.forEach((userId) => {
            if (!(userId in theme.scores)) theme.scores[userId] = 0;
        });

        return theme;
    });
}

function buildPlayerStats({ history, playerIds, finalScores, themeSummaries }) {
    const statsByUserId = {};

    playerIds.forEach((userId) => {
        statsByUserId[userId] = {
            userId,
            totalScore: Number(finalScores[userId]) || 0,
            pointsFromHistory: 0,
            roundsWon: 0,
            roundsPlayed: 0,
            themesWon: 0,
            attackRounds: 0,
            attackWins: 0,
            defenseRounds: 0,
            defenseWins: 0,
            timeoutsCaused: 0,
            timeoutsSuffered: 0,
            responseTimes: []
        };
    });

    const inferOpponent = (winnerUserId) => {
        if (!winnerUserId) return null;
        return playerIds.find((id) => id !== winnerUserId) || null;
    };

    history.forEach((round) => {
        const winnerUserId = round?.winnerUserId || null;
        const loserUserId = inferOpponent(winnerUserId);
        let attackerUserId = null;
        let defenderUserId = null;

        if (winnerUserId) {
            if (round.winner === 'attacker') {
                attackerUserId = winnerUserId;
                defenderUserId = loserUserId;
            } else if (round.winner === 'defender') {
                defenderUserId = winnerUserId;
                attackerUserId = loserUserId;
            }
        }

        if (winnerUserId && statsByUserId[winnerUserId]) {
            statsByUserId[winnerUserId].roundsWon += 1;
            statsByUserId[winnerUserId].pointsFromHistory += Number(round.scoreGained) || 0;
        }

        if (attackerUserId && statsByUserId[attackerUserId]) {
            statsByUserId[attackerUserId].roundsPlayed += 1;
            statsByUserId[attackerUserId].attackRounds += 1;
            if (round.winner === 'attacker') {
                statsByUserId[attackerUserId].attackWins += 1;
            }
            if (round.timedOut) {
                statsByUserId[attackerUserId].timeoutsCaused += 1;
            }
        }

        if (defenderUserId && statsByUserId[defenderUserId]) {
            statsByUserId[defenderUserId].roundsPlayed += 1;
            statsByUserId[defenderUserId].defenseRounds += 1;
            if (round.winner === 'defender') {
                statsByUserId[defenderUserId].defenseWins += 1;
            }
            if (round.timedOut) {
                statsByUserId[defenderUserId].timeoutsSuffered += 1;
            }
            if (typeof round.responseTime === 'number' && !Number.isNaN(round.responseTime)) {
                statsByUserId[defenderUserId].responseTimes.push(round.responseTime);
            }
        }
    });

    themeSummaries.forEach((theme) => {
        if (theme.winnerUserId && statsByUserId[theme.winnerUserId]) {
            statsByUserId[theme.winnerUserId].themesWon += 1;
        }
    });

    return playerIds.map((userId) => {
        const s = statsByUserId[userId];
        const attackSuccessRate = s.attackRounds > 0 ? s.attackWins / s.attackRounds : null;
        const defenseSuccessRate = s.defenseRounds > 0 ? s.defenseWins / s.defenseRounds : null;
        const avgResponseTime = s.responseTimes.length
            ? s.responseTimes.reduce((acc, n) => acc + n, 0) / s.responseTimes.length
            : null;
        const speedScore = avgResponseTime == null ? null : Math.max(0, 1 - (avgResponseTime / 30));
        const reliabilityRate = s.defenseRounds > 0 ? 1 - (s.timeoutsSuffered / s.defenseRounds) : null;

        return {
            ...s,
            totalScore: Number(finalScores[userId]) || s.pointsFromHistory || 0,
            attackSuccessRate,
            defenseSuccessRate,
            avgResponseTime,
            speedScore,
            reliabilityRate
        };
    });
}

function buildConclusions(player, opponent) {
    const notes = [];

    if ((player.attackSuccessRate || 0) >= 0.66) {
        notes.push('Forte em ataque: converteu a maioria das rondas ofensivas em brechas com pontuação.');
    } else if (player.attackRounds > 0) {
        notes.push('Ataque inconsistente: há margem para melhorar a escolha do vetor ofensivo nas rondas de ataque.');
    }

    if ((player.defenseSuccessRate || 0) >= 0.66) {
        notes.push('Boa disciplina defensiva: manteve taxa alta de respostas corretas como defensor.');
    } else if (player.defenseRounds > 0) {
        notes.push('Defesa vulnerável: precisa de maior precisão nas respostas e contramedidas.');
    }

    if (player.timeoutsSuffered === 0 && player.defenseRounds > 0) {
        notes.push('Excelente gestão de tempo: não sofreu timeouts enquanto defendia.');
    } else if (player.timeoutsSuffered > 0) {
        notes.push(`Gestão de tempo a melhorar: sofreu ${player.timeoutsSuffered} timeout(s) na defesa.`);
    }

    if (opponent) {
        const diff = player.totalScore - opponent.totalScore;
        if (diff > 0) {
            notes.push(`Terminou acima do adversário por ${diff} pontos no critério oficial (pontuação total).`);
        } else if (diff < 0) {
            notes.push(`Terminou abaixo do adversário por ${Math.abs(diff)} pontos no critério oficial (pontuação total).`);
        } else {
            notes.push('Terminou empatado em pontuação total; os indicadores complementares ajudam a interpretar o desempenho.');
        }
    }

    return notes.slice(0, 4);
}

function getPerformanceLevel(player, opponent, totalThemes, topScore) {
    const safeTopScore = Math.max(1, Number(topScore) || 1);
    const safeTotalThemes = Math.max(1, Number(totalThemes) || 1);
    const scoreRatio = clamp01((player?.totalScore || 0) / safeTopScore);
    const themesRatio = clamp01((player?.themesWon || 0) / safeTotalThemes);
    const attack = clamp01(player?.attackSuccessRate ?? 0);
    const defense = clamp01(player?.defenseSuccessRate ?? 0);
    const speed = clamp01(player?.speedScore ?? 0);
    const consistency = clamp01(player?.reliabilityRate ?? 0);
    const timeoutPenalty = Math.min(0.18, (player?.timeoutsSuffered || 0) * 0.03);

    const composite = clamp01(
        (scoreRatio * 0.36) +
        (themesRatio * 0.18) +
        (attack * 0.14) +
        (defense * 0.16) +
        (speed * 0.08) +
        (consistency * 0.08) -
        timeoutPenalty
    );

    let label = 'Operador Júnior';
    let tone = 'slate';
    let summary = 'Base sólida, mas ainda precisa de ganhar consistência tática e controlo de tempo.';

    if (composite >= 0.85) {
        label = 'Elite de Ciberdefesa';
        tone = 'emerald';
        summary = 'Desempenho de topo: forte pontuação, consistência e capacidade de adaptação ao longo das fases.';
    } else if (composite >= 0.72) {
        label = 'Especialista Tático';
        tone = 'sky';
        summary = 'Muito bom desempenho geral, com boa leitura de cenários e execução eficaz.';
    } else if (composite >= 0.58) {
        label = 'Analista Operacional';
        tone = 'yellow';
        summary = 'Desempenho equilibrado, com margem clara para elevar eficiência ofensiva/defensiva.';
    } else if (composite >= 0.42) {
        label = 'Praticante em Evolução';
        tone = 'rose';
        summary = 'Mostra potencial, mas precisa melhorar precisão, gestão de tempo e estabilidade ronda a ronda.';
    }

    const diff = opponent ? (player.totalScore - opponent.totalScore) : 0;
    const deltaLabel = diff === 0 ? 'Empate em score' : `${diff > 0 ? '+' : '-'}${Math.abs(diff)} pts vs adversário`;

    return {
        label,
        tone,
        summary,
        composite,
        deltaLabel
    };
}

function LevelBadge({ level }) {
    const tones = {
        emerald: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200 shadow-[0_0_22px_rgba(16,185,129,0.08)]',
        sky: 'border-sky-400/35 bg-sky-500/12 text-sky-200 shadow-[0_0_22px_rgba(14,165,233,0.08)]',
        yellow: 'border-yellow-400/35 bg-yellow-500/12 text-yellow-200 shadow-[0_0_22px_rgba(234,179,8,0.06)]',
        rose: 'border-rose-400/35 bg-rose-500/12 text-rose-200 shadow-[0_0_22px_rgba(244,63,94,0.06)]',
        slate: 'border-slate-400/25 bg-slate-500/10 text-slate-200'
    };
    const toneClass = tones[level?.tone] || tones.slate;

    return (
        <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Nível Final</p>
            <p className="font-orbitron font-bold text-sm leading-tight">{level?.label || 'N/A'}</p>
            <p className="text-[10px] font-mono opacity-80 mt-1">
                {level ? `${Math.round(level.composite * 100)}/100 • ${level.deltaLabel}` : '--'}
            </p>
        </div>
    );
}

function StatChip({ label, value, accent = 'emerald' }) {
    const accentClasses = {
        emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        sky: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
        yellow: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
        rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300'
    };

    return (
        <div className={`rounded-xl border px-3 py-2 ${accentClasses[accent] || accentClasses.emerald}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</p>
            <p className="font-orbitron font-bold text-lg leading-tight">{value}</p>
        </div>
    );
}

function MetricBar({ label, ratio, valueLabel, tone = 'emerald' }) {
    const tones = {
        emerald: 'from-emerald-500 to-cyan-400 border-emerald-500/30 text-emerald-200',
        sky: 'from-sky-500 to-blue-400 border-sky-500/30 text-sky-200',
        yellow: 'from-yellow-500 to-amber-400 border-yellow-500/30 text-yellow-200',
        rose: 'from-rose-500 to-pink-400 border-rose-500/30 text-rose-200'
    };
    const safeRatio = clamp01(ratio);
    const widthPct = Math.max(4, Math.round(safeRatio * 100));
    const toneClass = tones[tone] || tones.emerald;

    return (
        <div className={`rounded-xl border bg-slate-950/60 p-3 ${toneClass.split(' ').slice(2).join(' ')}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="text-xs font-mono text-slate-200">{valueLabel}</p>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${toneClass.split(' ').slice(0, 2).join(' ')} report-bar`}
                    style={{ width: `${widthPct}%` }}
                />
            </div>
        </div>
    );
}

function PlayerPanel({ player, opponent, isMe, isWinner, totalThemes, topScore }) {
    const accent = isMe ? 'emerald' : 'sky';
    const border = isMe ? 'border-emerald-500/40' : 'border-sky-500/40';
    const glow = isMe ? 'from-emerald-500/15 to-cyan-500/5' : 'from-sky-500/15 to-blue-500/5';
    const label = isMe ? 'TU' : 'ADVERSÁRIO';
    const conclusions = buildConclusions(player, opponent);
    const level = getPerformanceLevel(player, opponent, totalThemes, topScore);
    const attackRatio = player.attackSuccessRate == null ? 0 : player.attackSuccessRate;
    const defenseRatio = player.defenseSuccessRate == null ? 0 : player.defenseSuccessRate;
    const speedRatio = player.speedScore == null ? 0 : player.speedScore;
    const reliabilityRatio = player.reliabilityRate == null ? 0 : player.reliabilityRate;

    return (
        <section className={`relative overflow-hidden rounded-2xl border ${border} bg-slate-900/70 p-5`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${glow} pointer-events-none`} />
            <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                        <h3 className="text-xl font-orbitron font-black text-white flex items-center gap-2">
                            <span className={isMe ? 'text-emerald-400' : 'text-sky-400'}>
                                {isWinner ? 'Vencedor Global' : 'Relatório de Desempenho'}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">ID: {getShortId(player.userId)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pontuação Final</p>
                        <p className={`text-3xl font-orbitron font-black ${isMe ? 'text-emerald-300' : 'text-sky-300'}`}>
                            {player.totalScore}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatChip label="Temas Ganhos" value={player.themesWon} accent={accent} />
                    <StatChip label="Rondas Ganhas" value={player.roundsWon} accent={accent} />
                    <StatChip label="Sucesso Ataque" value={formatPercent(player.attackSuccessRate)} accent={accent} />
                    <StatChip label="Sucesso Defesa" value={formatPercent(player.defenseSuccessRate)} accent={accent} />
                    <StatChip label="Resp. Média" value={formatSeconds(player.avgResponseTime)} accent={accent} />
                    <StatChip label="Timeouts Sofridos" value={player.timeoutsSuffered} accent={player.timeoutsSuffered ? 'rose' : 'yellow'} />
                </div>

                <div className="mb-4 grid sm:grid-cols-[1fr_1.35fr] gap-3">
                    <LevelBadge level={level} />
                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Classificação</p>
                        <p className="text-sm text-slate-200 leading-relaxed">{level.summary}</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <MetricBar
                        label="Eficiência Ataque"
                        ratio={attackRatio}
                        valueLabel={formatPercent(player.attackSuccessRate)}
                        tone={isMe ? 'emerald' : 'sky'}
                    />
                    <MetricBar
                        label="Eficiência Defesa"
                        ratio={defenseRatio}
                        valueLabel={formatPercent(player.defenseSuccessRate)}
                        tone={isMe ? 'emerald' : 'sky'}
                    />
                    <MetricBar
                        label="Velocidade Defesa"
                        ratio={speedRatio}
                        valueLabel={formatSeconds(player.avgResponseTime)}
                        tone="yellow"
                    />
                    <MetricBar
                        label="Consistência"
                        ratio={reliabilityRatio}
                        valueLabel={formatPercent(player.reliabilityRate)}
                        tone={player.timeoutsSuffered > 0 ? 'rose' : 'yellow'}
                    />
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400 mb-3">Conclusões</p>
                    <div className="space-y-2">
                        {conclusions.map((note) => (
                            <div key={note} className="flex items-start gap-2 text-sm text-slate-200">
                                <span className={`mt-1 h-2 w-2 rounded-full ${isMe ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                                <span>{note}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function ThemeCard({ theme, themeIndex, playerIds, myUserId, expanded = false, onToggle = null }) {
    const myThemeScore = Number(theme.scores[myUserId]) || 0;
    const opponentId = playerIds.find((id) => id !== myUserId) || null;
    const opponentThemeScore = opponentId ? (Number(theme.scores[opponentId]) || 0) : 0;
    const iWonTheme = theme.winnerUserId && theme.winnerUserId === myUserId;
    const timeoutCount = theme.rounds.filter((round) => round?.timedOut).length;
    const criticalRoundsCount = theme.rounds.filter((round) => (round?.timedOut || (round?.scoreGained || 0) >= 220)).length;

    return (
        <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 overflow-hidden">
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${iWonTheme ? 'from-emerald-500/10 via-transparent to-emerald-400/5' : 'from-sky-500/8 via-transparent to-slate-400/5'}`} />
            <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Fase {themeIndex + 1}</p>
                        <h4 className="text-lg font-orbitron font-bold text-white leading-tight">{theme.themeName}</h4>
                        <p className="text-xs text-slate-500 font-mono">{theme.themeId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        {criticalRoundsCount > 0 && (
                            <span className="px-2 py-1 rounded-full border text-[10px] font-mono border-amber-400/30 bg-amber-500/10 text-amber-200">
                                {criticalRoundsCount} ronda(s) crítica(s)
                            </span>
                        )}
                        <span className={`px-3 py-1 rounded-full border text-xs font-mono ${iWonTheme ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : 'border-sky-400/30 bg-sky-500/10 text-sky-200'}`}>
                            {theme.winnerUserId
                                ? (theme.winnerUserId === myUserId ? 'Tema ganho por ti' : 'Tema ganho pelo adversário')
                                : 'Sem vencedor identificado'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">TU</p>
                        <p className="text-2xl font-orbitron font-black text-emerald-300">{myThemeScore}</p>
                    </div>
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/8 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-sky-200/70">ADVERSÁRIO</p>
                        <p className="text-2xl font-orbitron font-black text-sky-300">{opponentThemeScore}</p>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="px-2 py-1 rounded-full border border-slate-700 text-slate-300">
                                {theme.rounds.length} ronda(s)
                            </span>
                            <span className={`px-2 py-1 rounded-full border ${timeoutCount ? 'border-rose-400/25 text-rose-300 bg-rose-500/8' : 'border-slate-700 text-slate-400'}`}>
                                {timeoutCount} timeout(s)
                            </span>
                        </div>
                        {onToggle && (
                            <button
                                onClick={onToggle}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${expanded
                                    ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200'
                                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'
                                    }`}
                            >
                                {expanded ? 'Ocultar rondas' : 'Ver rondas'}
                            </button>
                        )}
                    </div>
                </div>

                <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="space-y-2 pt-1">
                            {theme.rounds.map((round, idx) => {
                                const roundWonByMe = round?.winnerUserId && round.winnerUserId === myUserId;
                                const winnerRoleLabel = round?.winner === 'defender' ? 'Defesa' : 'Ataque';
                                const isCritical = Boolean(round?.timedOut || (round?.scoreGained || 0) >= 220);

                                return (
                                    <div
                                        key={`${theme.themeId}_${idx}_${round?.timestamp || idx}`}
                                        className={`rounded-xl border px-3 py-2 text-sm ${isCritical
                                            ? 'border-amber-400/25 bg-amber-500/8'
                                            : roundWonByMe
                                                ? 'border-emerald-500/30 bg-emerald-500/8'
                                                : 'border-slate-700 bg-slate-950/60'
                                            }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono text-slate-400">R{idx + 1}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${roundWonByMe ? 'border-emerald-400/30 text-emerald-300' : 'border-slate-600 text-slate-300'}`}>
                                                    {winnerRoleLabel}
                                                </span>
                                                {round?.timedOut && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-400/30 text-rose-300">
                                                        Timeout
                                                    </span>
                                                )}
                                                {isCritical && !round?.timedOut && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-200">
                                                        Alta pontuação
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-mono">
                                                <span className="text-slate-400">{formatSeconds(round?.responseTime)}</span>
                                                <span className={roundWonByMe ? 'text-emerald-300' : 'text-slate-300'}>
                                                    +{round?.scoreGained || 0} pts
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreTrendChart({ themeSummaries, myUserId, playerIds }) {
    const opponentId = playerIds.find((id) => id !== myUserId) || null;
    const points = themeSummaries.map((theme, index) => ({
        index,
        label: `F${index + 1}`,
        myScore: Number(theme.scores[myUserId]) || 0,
        opponentScore: opponentId ? (Number(theme.scores[opponentId]) || 0) : 0
    }));
    const maxScore = Math.max(1, ...points.flatMap((p) => [p.myScore, p.opponentScore]));

    if (!points.length) {
        return (
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-5 text-center text-slate-400 font-mono text-sm">
                Sem dados suficientes para desenhar a evolução por fase.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Evolução por Fase</p>
                    <h3 className="text-xl font-orbitron font-bold text-white">Pontuação fase a fase</h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> TU
                    </span>
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
                        <span className="h-2 w-2 rounded-full bg-sky-400" /> ADV.
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {points.map((p) => {
                    const myWidth = Math.max(3, Math.round((p.myScore / maxScore) * 100));
                    const oppWidth = Math.max(3, Math.round((p.opponentScore / maxScore) * 100));
                    const leader = p.myScore === p.opponentScore ? 'empate' : (p.myScore > p.opponentScore ? 'tu' : 'adv');

                    return (
                        <div key={p.label} className="rounded-xl border border-slate-700 bg-slate-950/55 p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-xs font-mono text-slate-400">{p.label}</p>
                                <p className={`text-[10px] uppercase tracking-[0.2em] ${leader === 'tu' ? 'text-emerald-300' : leader === 'adv' ? 'text-sky-300' : 'text-slate-300'}`}>
                                    {leader === 'tu' ? 'Tu lideraste' : leader === 'adv' ? 'Adversário liderou' : 'Empate'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                                        <span className="text-emerald-300">TU</span>
                                        <span className="text-slate-300">{p.myScore} pts</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 report-bar" style={{ width: `${myWidth}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                                        <span className="text-sky-300">ADV.</span>
                                        <span className="text-slate-300">{p.opponentScore} pts</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-sky-500 to-blue-400 report-bar" style={{ width: `${oppWidth}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RadarCompareChart({ myPlayer, opponentPlayer, totalThemes }) {
    if (!myPlayer) return null;

    const safeTotalThemes = Math.max(1, Number(totalThemes) || 1);
    const metrics = [
        { key: 'attack', label: 'Ataque', get: (p) => p?.attackSuccessRate ?? 0 },
        { key: 'defense', label: 'Defesa', get: (p) => p?.defenseSuccessRate ?? 0 },
        { key: 'speed', label: 'Veloc.', get: (p) => p?.speedScore ?? 0 },
        { key: 'consistency', label: 'Consist.', get: (p) => p?.reliabilityRate ?? 0 },
        { key: 'themes', label: 'Temas', get: (p) => (p ? (p.themesWon / safeTotalThemes) : 0) }
    ];

    const size = 280;
    const cx = 140;
    const cy = 140;
    const radius = 96;
    const startAngle = -90;
    const angleStep = 360 / metrics.length;

    const buildPolygon = (player) => metrics.map((metric, index) => {
        const ratio = clamp01(metric.get(player));
        const point = polarPoint(cx, cy, radius * ratio, startAngle + (angleStep * index));
        return `${point.x},${point.y}`;
    }).join(' ');

    const myPolygon = buildPolygon(myPlayer);
    const opponentPolygon = opponentPlayer ? buildPolygon(opponentPlayer) : null;

    return (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Radar Tático</p>
                    <h3 className="text-xl font-orbitron font-bold text-white">Comparação multidimensional</h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> TU
                    </span>
                    {opponentPlayer && (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
                            <span className="h-2 w-2 rounded-full bg-sky-400" /> ADV.
                        </span>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-[300px_1fr] gap-4 items-center">
                <div className="mx-auto w-full max-w-[300px]">
                    <svg viewBox="0 0 280 280" className="w-full h-auto">
                        {[0.25, 0.5, 0.75, 1].map((level) => {
                            const points = metrics.map((_, index) => {
                                const point = polarPoint(cx, cy, radius * level, startAngle + (angleStep * index));
                                return `${point.x},${point.y}`;
                            }).join(' ');
                            return (
                                <polygon
                                    key={`grid_${level}`}
                                    points={points}
                                    fill="none"
                                    stroke="rgba(148,163,184,0.20)"
                                    strokeWidth="1"
                                />
                            );
                        })}

                        {metrics.map((metric, index) => {
                            const angle = startAngle + (angleStep * index);
                            const outer = polarPoint(cx, cy, radius, angle);
                            const label = polarPoint(cx, cy, radius + 22, angle);
                            return (
                                <g key={metric.key}>
                                    <line
                                        x1={cx}
                                        y1={cy}
                                        x2={outer.x}
                                        y2={outer.y}
                                        stroke="rgba(148,163,184,0.25)"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={label.x}
                                        y={label.y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="rgba(226,232,240,0.9)"
                                        fontSize="10"
                                        fontFamily="monospace"
                                        letterSpacing="1"
                                    >
                                        {metric.label}
                                    </text>
                                </g>
                            );
                        })}

                        {opponentPolygon && (
                            <polygon
                                points={opponentPolygon}
                                fill="rgba(56,189,248,0.14)"
                                stroke="rgba(56,189,248,0.95)"
                                strokeWidth="2"
                                className="radar-poly"
                            />
                        )}
                        <polygon
                            points={myPolygon}
                            fill="rgba(16,185,129,0.18)"
                            stroke="rgba(16,185,129,0.95)"
                            strokeWidth="2"
                            className="radar-poly"
                        />
                        <circle cx={cx} cy={cy} r="3" fill="rgba(241,245,249,0.9)" />
                    </svg>
                </div>

                <div className="space-y-2">
                    {metrics.map((metric) => {
                        const myValue = clamp01(metric.get(myPlayer));
                        const oppValue = opponentPlayer ? clamp01(metric.get(opponentPlayer)) : 0;
                        const myPct = Math.max(4, Math.round(myValue * 100));
                        const oppPct = Math.max(4, Math.round(oppValue * 100));
                        return (
                            <div key={`radar_row_${metric.key}`} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{metric.label}</span>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-emerald-300">{Math.round(myValue * 100)}</span>
                                        {opponentPlayer && <span className="text-sky-300">{Math.round(oppValue * 100)}</span>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 report-bar" style={{ width: `${myPct}%` }} />
                                    </div>
                                    {opponentPlayer && (
                                        <div className="h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-sky-500 to-blue-400 report-bar" style={{ width: `${oppPct}%` }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function GameReportScreen({ gameState, myUserId, onRestart, themesCatalog = [] }) {
    const [show, setShow] = useState(false);
    const [themeFilter, setThemeFilter] = useState('all');
    const [expandedThemes, setExpandedThemes] = useState({});

    useEffect(() => {
        const t = setTimeout(() => setShow(true), 20);
        return () => clearTimeout(t);
    }, []);

    const history = Array.isArray(gameState?.history) ? gameState.history : [];
    const finalScores = gameState?.finalScores || gameState?.scoresByUserId || {};
    const catalogById = Object.fromEntries((themesCatalog || []).map((t) => [t.id, t]));

    const discoveredPlayerIds = unique([
        ...Object.keys(finalScores || {}),
        ...history.map((round) => round?.winnerUserId),
        myUserId
    ]);

    const resolvedMyUserId = myUserId || discoveredPlayerIds[0] || null;
    const opponentUserId = discoveredPlayerIds.find((id) => id !== resolvedMyUserId) || null;
    const visiblePlayerIds = unique([resolvedMyUserId, opponentUserId]);
    const fallbackPlayerIds = visiblePlayerIds.length ? visiblePlayerIds : discoveredPlayerIds.slice(0, 2);

    const themeSummaries = buildThemeSummaries(history, fallbackPlayerIds, catalogById);
    const players = buildPlayerStats({
        history,
        playerIds: fallbackPlayerIds,
        finalScores,
        themeSummaries
    });

    const myPlayer = players.find((p) => p.userId === resolvedMyUserId) || players[0] || null;
    const opponentPlayer = players.find((p) => p.userId !== myPlayer?.userId) || null;
    const globalWinnerUserId = gameState?.globalWinnerUserId || null;
    const iAmWinner = Boolean(myPlayer && globalWinnerUserId && myPlayer.userId === globalWinnerUserId);
    const totalThemes = themeSummaries.length || (gameState?.playedThemes?.length || 0);
    const totalRounds = history.length || gameState?.totalRounds || 0;
    const filteredThemeSummaries = themeSummaries.filter((theme) => {
        if (themeFilter === 'all') return true;
        if (themeFilter === 'won') return theme.winnerUserId === resolvedMyUserId;
        if (themeFilter === 'lost') return Boolean(theme.winnerUserId && theme.winnerUserId !== resolvedMyUserId);
        if (themeFilter === 'timeout') return theme.rounds.some((round) => round?.timedOut);
        return true;
    });
    const timeoutThemeCount = themeSummaries.filter((theme) => theme.rounds.some((round) => round?.timedOut)).length;
    const getThemeKey = (theme) => `${theme.themeId}__${theme.themeName}`;
    const toggleThemeExpanded = (themeKey) => {
        setExpandedThemes((prev) => ({
            ...prev,
            [themeKey]: !prev[themeKey]
        }));
    };
    const expandFilteredThemes = () => {
        setExpandedThemes((prev) => {
            const next = { ...prev };
            filteredThemeSummaries.forEach((theme) => {
                next[getThemeKey(theme)] = true;
            });
            return next;
        });
    };
    const collapseFilteredThemes = () => {
        setExpandedThemes((prev) => {
            const next = { ...prev };
            filteredThemeSummaries.forEach((theme) => {
                next[getThemeKey(theme)] = false;
            });
            return next;
        });
    };

    const topScore = Math.max(1, ...players.map((p) => p.totalScore || 0));

    if (!myPlayer) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 font-mono p-6">
                Sem dados suficientes para gerar o relatório final.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.10),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.08),transparent_45%)]" />
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

            <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <header className="mb-8 rounded-3xl border border-slate-700/80 bg-slate-900/75 backdrop-blur p-6 sm:p-8 overflow-hidden relative">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-emerald-500/10 via-transparent to-sky-500/10" />
                    <div className="relative">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Relatório Final do Jogo</p>
                                <h1 className="text-3xl sm:text-5xl font-orbitron font-black leading-tight">
                                    <span className={iAmWinner ? 'text-emerald-300' : 'text-sky-200'}>
                                        {iAmWinner ? 'VITÓRIA ESTRATÉGICA' : 'ANÁLISE PÓS-MISSÃO'}
                                    </span>
                                </h1>
                                <p className="mt-3 max-w-3xl text-slate-300">
                                    Critério oficial de vencedor: maior pontuação total acumulada por utilizador em todas as rondas e temas.
                                    Os painéis abaixo mostram também indicadores complementares (ataque, defesa, tempo e consistência).
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
                                <StatChip label="Temas" value={totalThemes} accent="emerald" />
                                <StatChip label="Rondas" value={totalRounds} accent="sky" />
                                <StatChip label="Vencedor" value={iAmWinner ? 'TU' : 'ADVERS.'} accent={iAmWinner ? 'emerald' : 'sky'} />
                                <StatChip label="Score Líder" value={Math.max(...players.map((p) => p.totalScore || 0))} accent="yellow" />
                            </div>
                        </div>

                        <div className="mt-6 grid lg:grid-cols-2 gap-4">
                            <PlayerPanel
                                player={myPlayer}
                                opponent={opponentPlayer}
                                isMe={true}
                                isWinner={Boolean(globalWinnerUserId && myPlayer.userId === globalWinnerUserId)}
                                totalThemes={totalThemes}
                                topScore={topScore}
                            />
                            {opponentPlayer && (
                                <PlayerPanel
                                    player={opponentPlayer}
                                    opponent={myPlayer}
                                    isMe={false}
                                    isWinner={Boolean(globalWinnerUserId && opponentPlayer.userId === globalWinnerUserId)}
                                    totalThemes={totalThemes}
                                    topScore={topScore}
                                />
                            )}
                        </div>
                    </div>
                </header>

                <section className="mb-8 grid xl:grid-cols-[1.05fr_0.95fr] gap-4">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Como a Avaliação Final é Feita</p>
                        <div className="space-y-3 text-sm text-slate-200">
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4">
                                <p className="font-orbitron font-bold text-emerald-300 mb-1">Critério Oficial</p>
                                <p>Vence quem tiver a maior <strong>pontuação total por ID de utilizador</strong> no fim das 11 fases.</p>
                            </div>
                            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                                <p className="font-orbitron font-bold text-slate-200 mb-2">Indicadores complementares exibidos no relatório</p>
                                <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Temas ganhos</div>
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Rondas ganhas</div>
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Taxa de sucesso em ataque</div>
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Taxa de sucesso em defesa</div>
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Tempo médio de resposta</div>
                                    <div className="rounded-lg border border-slate-700 px-3 py-2">Timeouts sofridos/causados</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Comparação Final</p>
                            <div className="space-y-4">
                                {players.map((player) => {
                                    const isMe = player.userId === resolvedMyUserId;
                                    const widthPct = Math.max(6, Math.round(((player.totalScore || 0) / topScore) * 100));
                                    return (
                                        <div key={player.userId} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div>
                                                    <p className={`text-xs uppercase tracking-[0.2em] ${isMe ? 'text-emerald-300' : 'text-sky-300'}`}>
                                                        {isMe ? 'Tu' : 'Adversário'}
                                                    </p>
                                                    <p className="text-xs font-mono text-slate-500">{getShortId(player.userId)}</p>
                                                </div>
                                                <p className="text-2xl font-orbitron font-black">{player.totalScore}</p>
                                            </div>
                                            <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                <div
                                                    className={`h-full ${isMe ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-sky-500 to-blue-400'} report-bar`}
                                                    style={{ width: `${widthPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <ScoreTrendChart
                            themeSummaries={themeSummaries}
                            myUserId={resolvedMyUserId}
                            playerIds={fallbackPlayerIds}
                        />

                        <RadarCompareChart
                            myPlayer={myPlayer}
                            opponentPlayer={opponentPlayer}
                            totalThemes={totalThemes}
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Linha do Tempo das Fases</p>
                            <h2 className="text-2xl font-orbitron font-black text-white">Resumo de todas as fases jogadas</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-mono text-slate-400 rounded-full border border-slate-700 px-3 py-1 bg-slate-950/60">
                                {themeSummaries.length} fases analisadas
                            </div>
                            <div className="text-xs font-mono text-rose-300 rounded-full border border-rose-500/25 px-3 py-1 bg-rose-500/8">
                                {timeoutThemeCount} com timeout
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                        {[
                            { id: 'all', label: 'Todas', count: themeSummaries.length },
                            { id: 'won', label: 'Ganhas', count: themeSummaries.filter((t) => t.winnerUserId === resolvedMyUserId).length },
                            { id: 'lost', label: 'Perdidas', count: themeSummaries.filter((t) => t.winnerUserId && t.winnerUserId !== resolvedMyUserId).length },
                            { id: 'timeout', label: 'Com Timeout', count: timeoutThemeCount }
                        ].map((filter) => {
                            const active = themeFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setThemeFilter(filter.id)}
                                    className={`px-3 py-2 rounded-xl border text-sm font-mono transition-all ${active
                                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.10)]'
                                        : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500'
                                        }`}
                                >
                                    {filter.label} <span className="opacity-70">({filter.count})</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                        <button
                            onClick={expandFilteredThemes}
                            className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm font-mono hover:bg-emerald-500/15 transition-all"
                        >
                            Expandir visíveis
                        </button>
                        <button
                            onClick={collapseFilteredThemes}
                            className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-950/50 text-slate-300 text-sm font-mono hover:border-slate-500 transition-all"
                        >
                            Recolher visíveis
                        </button>
                    </div>

                    {filteredThemeSummaries.length === 0 ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-6 text-center text-slate-400 font-mono">
                            Nenhuma fase corresponde ao filtro selecionado.
                        </div>
                    ) : (
                        <div className="grid xl:grid-cols-2 gap-4">
                            {filteredThemeSummaries.map((theme, index) => (
                                (() => {
                                    const themeKey = getThemeKey(theme);
                                    const defaultExpanded = index < 2 && themeFilter === 'all';
                                    const isExpanded = expandedThemes[themeKey] ?? defaultExpanded;
                                    return (
                                <div
                                    key={`${themeFilter}_${theme.themeId}_${index}`}
                                    className="phase-card-enter"
                                    style={{ animationDelay: `${index * 55}ms` }}
                                >
                                    <ThemeCard
                                        theme={theme}
                                        themeIndex={themeSummaries.findIndex((t) => t === theme)}
                                        playerIds={fallbackPlayerIds}
                                        myUserId={resolvedMyUserId}
                                        expanded={isExpanded}
                                        onToggle={() => toggleThemeExpanded(themeKey)}
                                    />
                                </div>
                                    );
                                })()
                            ))}
                        </div>
                    )}
                </section>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Estado Final</p>
                        <p className="text-lg text-white font-orbitron font-bold">
                            {iAmWinner ? 'Conseguiste a melhor pontuação global.' : 'O adversário terminou com a melhor pontuação global.'}
                        </p>
                        <p className="text-sm text-slate-400">
                            Usa este relatório para identificar padrões por fase e melhorar estratégia/tempo nas próximas sessões.
                        </p>
                    </div>
                    <button
                        onClick={onRestart || (() => window.location.reload())}
                        className="px-6 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 font-orbitron font-bold hover:bg-emerald-500/25 hover:border-emerald-300 transition-all shadow-[0_0_30px_rgba(16,185,129,0.12)]"
                    >
                        NOVA SESSÃO
                    </button>
                </div>
            </div>

            <style>{`
@keyframes reportBarGrow {
  from { transform: scaleX(0); opacity: 0.6; }
  to { transform: scaleX(1); opacity: 1; }
}
@keyframes phaseReveal {
  from { opacity: 0; transform: translateY(12px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes radarPulse {
  0% { opacity: 0.75; }
  50% { opacity: 1; }
  100% { opacity: 0.78; }
}
.report-bar {
  transform-origin: left center;
  animation: reportBarGrow 700ms ease-out;
}
.phase-card-enter {
  opacity: 0;
  animation: phaseReveal 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.radar-poly {
  animation: radarPulse 2200ms ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .report-bar,
  .phase-card-enter,
  .radar-poly {
    animation: none !important;
  }
}
            `}</style>
        </div>
    );
}

export default GameReportScreen;
