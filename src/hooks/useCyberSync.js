import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'cyber_siege_state';

// Estados do jogo
export const GameStatus = {
    LOBBY: 'LOBBY',           // Jogadores a selecionar
    READY: 'READY',           // Ambos prontos, a aguardar ataque
    ATTACKING: 'ATTACKING',   // Ataque em curso
    DEFENDED: 'DEFENDED',     // Defensor ganhou
    BREACHED: 'BREACHED'      // Atacante ganhou
};

// Estado inicial limpo
const createInitialState = () => ({
    sessionId: Date.now().toString(),
    activeThemeId: null,
    activeTheme: null,
    gameStatus: GameStatus.LOBBY,
    attackerTool: null,
    defenderTool: null,
    startTime: null,
    endTime: null,
    attackerScore: 0,
    defenderScore: 0,
    roundNumber: 0,
    responseTime: null,
    streak: 0,
    totalRounds: 0,
    history: []
});

// Ler estado do localStorage
const getStoredState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge com estado inicial para garantir que todos os campos existem
            return {
                ...createInitialState(),
                ...parsed,
                // Garantir que history é sempre um array
                history: Array.isArray(parsed.history) ? parsed.history : []
            };
        }
    } catch (error) {
        console.error('Erro ao ler estado:', error);
    }
    return createInitialState();
};

// Guardar estado no localStorage
const saveState = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Erro ao guardar estado:', error);
    }
};

export function useCyberSync() {
    const [gameState, setGameState] = useState(() => {
        const stored = getStoredState();
        // Se estado antigo (mais de 5 min), limpa
        if (stored.gameStatus !== GameStatus.LOBBY &&
            stored.startTime &&
            Date.now() - stored.startTime > 5 * 60 * 1000) {
            const fresh = createInitialState();
            saveState(fresh);
            return fresh;
        }
        return stored;
    });

    const lastSyncRef = useRef(gameState);

    // Sincronizar com outras janelas via storage event
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === STORAGE_KEY && event.newValue) {
                try {
                    const newState = JSON.parse(event.newValue);
                    setGameState(newState);
                    lastSyncRef.current = newState;
                } catch (error) {
                    console.error('Erro ao sincronizar:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Polling para sincronização (cada 300ms)
    useEffect(() => {
        const pollInterval = setInterval(() => {
            const stored = getStoredState();

            if (stored.gameStatus !== lastSyncRef.current.gameStatus ||
                stored.attackerTool !== lastSyncRef.current.attackerTool ||
                stored.roundNumber !== lastSyncRef.current.roundNumber) {
                setGameState(stored);
                lastSyncRef.current = stored;
            }
        }, 300);

        return () => clearInterval(pollInterval);
    }, []);

    // === AÇÕES DO JOGO ===

    // Entrar no jogo
    const startGame = useCallback((theme) => {
        const current = getStoredState();

        // Verificar se há um jogo ATIVO com o mesmo tema
        const isSameTheme = current.activeThemeId === theme.id;
        const isGameActive = current.gameStatus === GameStatus.READY ||
            current.gameStatus === GameStatus.ATTACKING;
        const isGameRecent = current.startTime &&
            (Date.now() - current.startTime) < 2 * 60 * 1000; // 2 minutos

        // Se há um jogo ativo e recente com o mesmo tema, sincroniza
        if (isSameTheme && isGameActive && (isGameRecent || current.gameStatus === GameStatus.READY)) {
            console.log('Joining existing game:', current.gameStatus);
            setGameState(current);
            lastSyncRef.current = current;
            return;
        }

        // Caso contrário, inicia novo jogo limpo
        console.log('Starting new game');
        const newState = {
            ...createInitialState(),
            activeThemeId: theme.id,
            activeTheme: theme,
            gameStatus: GameStatus.READY
        };

        saveState(newState);
        setGameState(newState);
        lastSyncRef.current = newState;
    }, []);

    // Atacante executa ataque
    const executeAttack = useCallback((toolId) => {
        const current = getStoredState();
        const newState = {
            ...current,
            attackerTool: toolId,
            defenderTool: null,
            startTime: Date.now(),
            gameStatus: GameStatus.ATTACKING,
            roundNumber: current.roundNumber + 1
        };
        saveState(newState);
        setGameState(newState);
        lastSyncRef.current = newState;
    }, []);

    // Calcular pontuação
    const calculateScore = (timeRemaining, maxTime, correct, streak) => {
        if (!correct) return 0;
        const base = 100;
        const timeBonus = Math.round((timeRemaining / maxTime) * 200);
        const streakBonus = streak * 50;
        return base + timeBonus + streakBonus;
    };

    // Defensor executa defesa
    const executeDefense = useCallback((toolId, isCorrect, timeRemaining = 0) => {
        const current = getStoredState();
        const maxTime = current.activeTheme?.tempo || 30;
        const score = calculateScore(timeRemaining, maxTime, isCorrect, current.streak);

        const roundResult = {
            round: current.roundNumber,
            themeId: current.activeThemeId,
            themeName: current.activeTheme?.titulo,
            attackerTool: current.attackerTool,
            defenderTool: toolId,
            isCorrect,
            responseTime: current.startTime ? (Date.now() - current.startTime) / 1000 : 0,
            scoreGained: score,
            winner: isCorrect ? 'defender' : 'attacker'
        };

        const newState = {
            ...current,
            defenderTool: toolId,
            endTime: Date.now(),
            responseTime: roundResult.responseTime,
            gameStatus: isCorrect ? GameStatus.DEFENDED : GameStatus.BREACHED,
            defenderScore: current.defenderScore + score,
            attackerScore: isCorrect ? current.attackerScore : current.attackerScore + 150,
            streak: isCorrect ? current.streak + 1 : 0,
            totalRounds: current.totalRounds + 1,
            history: [...current.history, roundResult]
        };

        saveState(newState);
        setGameState(newState);
        lastSyncRef.current = newState;
    }, []);

    // Tempo esgotado
    const timeExpired = useCallback(() => {
        const current = getStoredState();

        const roundResult = {
            round: current.roundNumber,
            themeId: current.activeThemeId,
            themeName: current.activeTheme?.titulo,
            attackerTool: current.attackerTool,
            defenderTool: null,
            isCorrect: false,
            responseTime: current.activeTheme?.tempo || 0,
            scoreGained: 0,
            winner: 'attacker',
            timedOut: true
        };

        const newState = {
            ...current,
            endTime: Date.now(),
            gameStatus: GameStatus.BREACHED,
            attackerScore: current.attackerScore + 200,
            streak: 0,
            totalRounds: current.totalRounds + 1,
            history: [...current.history, roundResult]
        };

        saveState(newState);
        setGameState(newState);
        lastSyncRef.current = newState;
    }, []);

    // Reiniciar jogo
    const resetGame = useCallback(() => {
        const freshState = createInitialState();
        saveState(freshState);
        setGameState(freshState);
        lastSyncRef.current = freshState;
    }, []);

    // Nova ronda
    const nextRound = useCallback(() => {
        const current = getStoredState();
        const newState = {
            ...current,
            gameStatus: GameStatus.READY,
            attackerTool: null,
            defenderTool: null,
            startTime: null,
            endTime: null,
            responseTime: null
        };
        saveState(newState);
        setGameState(newState);
        lastSyncRef.current = newState;
    }, []);

    return {
        gameState,
        startGame,
        executeAttack,
        executeDefense,
        timeExpired,
        resetGame,
        nextRound,
        GameStatus
    };
}

export default useCyberSync;
