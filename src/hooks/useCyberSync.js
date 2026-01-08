/**
 * useCyberSync - Hook de Sincronização Multiplayer
 * 
 * VERSÃO ATUALIZADA: Usa Socket.IO para comunicação em tempo real
 * entre dispositivos diferentes (atacante e defensor).
 * 
 * Substitui a versão anterior baseada em localStorage que só
 * funcionava no mesmo computador.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import socket, { connectSocket, disconnectSocket, isConnected } from './socketClient';

// Helper para gerar UUID simples
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Recuperar ou criar ID persistente do utilizador
const getPersistentUserId = () => {
    let id = localStorage.getItem('cyber_siege_userId');
    if (!id) {
        id = generateUUID();
        localStorage.setItem('cyber_siege_userId', id);
    }
    return id;
};
const PERMANENT_USER_ID = getPersistentUserId(); // Constante por sessão do browser

// Estados do jogo (mantidos iguais para compatibilidade)
export const GameStatus = {
    LOBBY: 'LOBBY',           // Jogadores a selecionar
    READY: 'READY',           // Ambos prontos, a aguardar ataque
    ATTACKING: 'ATTACKING',   // Ataque em curso
    DEFENDED: 'DEFENDED',     // Defensor ganhou
    BREACHED: 'BREACHED',      // Atacante ganhou
    THEME_COMPLETED: 'THEME_COMPLETED', // Tema completo
    GAME_FINISHED: 'GAME_FINISHED' // Jogo terminado
};

// Estado inicial limpo
const createInitialState = () => ({
    sessionId: null,
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
    playedThemes: [],
    themeRoundCount: 0,
    history: [],
    players: {
        attacker: false,
        defender: false
    },
    connected: false,
    role: null
});

export function useCyberSync(role = null) {
    const [gameState, setGameState] = useState(createInitialState);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const roleRef = useRef(role);

    // Atualizar ref quando role muda
    useEffect(() => {
        roleRef.current = role;
    }, [role]);

    // Ref para acesso ao estado atual dentro dos event listeners
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // ===== GESTÃO DE CONEXÃO =====

    useEffect(() => {
        // Conectar ao servidor
        connectSocket();

        // Handler para estado do jogo
        const handleGameState = (state) => {
            console.log('📥 Estado recebido:', state);
            setGameState(prev => ({
                ...prev,
                ...state,
                gameStatus: state.gameStatus || state.status,
                connected: true
            }));
        };

        // Handler para conexão estabelecida
        const handleConnect = () => {
            console.log('✅ Conectado ao servidor');
            setConnectionStatus('connected');
            setGameState(prev => ({ ...prev, connected: true }));

            // Tentar recuperar sessão após reconexão (Auto-Rejoin)
            const currentState = gameStateRef.current;
            if (currentState.sessionId && currentState.role) {
                console.log(`🔄 A recuperar sessão ${currentState.sessionId} como ${currentState.role}...`);
                socket.emit('join_game', {
                    sessionId: currentState.sessionId,
                    role: currentState.role,
                    theme: currentState.activeTheme
                });
            }
        };

        // Handler para desconexão
        const handleDisconnect = () => {
            console.log('❌ Desconectado do servidor');
            setConnectionStatus('disconnected');
            setGameState(prev => ({ ...prev, connected: false }));
        };

        // Handler para erro de conexão
        const handleConnectError = (error) => {
            console.error('❌ Erro de conexão:', error.message);
            setConnectionStatus('error');
        };

        // Handler para erros do servidor (lógica de jogo)
        const handleSocketError = (error) => {
            console.error('❌ Erro do servidor:', error);
            const msg = error?.message || 'Erro desconhecido';

            setGameState(prev => {
                // Se erro ocorrer durante o join (temos sessao mas nao estamos confirmados/connected ou role mismatch), resetar
                // Simplificação: Sempre guardar erro no estado para UI mostrar
                // Se erro for "Sala cheia" ou "Sala não encontrada", resetar sessionId para permitir tentar de novo

                const criticalErrors = ['Sala cheia', 'A aguardar pelo anfitrião', 'ID da sessão é obrigatório'];
                const shouldReset = criticalErrors.some(e => msg.includes(e));

                return {
                    ...prev,
                    error: msg,
                    sessionId: shouldReset ? null : prev.sessionId,
                    role: shouldReset ? null : prev.role
                };
            });
        };

        // Handler para jogador que entrou
        const handlePlayerJoined = ({ role: joinedRole, socketId }) => {
            console.log(`👤 ${joinedRole} entrou:`, socketId);
        };

        // Handler para jogador que saiu
        const handlePlayerDisconnected = ({ role: leftRole }) => {
            console.log(`👤 ${leftRole} saiu`);
        };

        // Handler para ataque executado
        const handleAttackExecuted = ({ toolId, roundNumber, startTime }) => {
            console.log(`⚔️ Ataque recebido: ${toolId}`);
            setGameState(prev => ({
                ...prev,
                attackerTool: toolId,
                roundNumber,
                startTime,
                gameStatus: GameStatus.ATTACKING
            }));
        };

        // Handler para resultado da ronda
        const handleRoundResult = (result) => {
            console.log('🏆 Resultado:', result);
        };

        // Handler para jogo reiniciado
        const handleGameReset = () => {
            console.log('🔄 Jogo reiniciado');
        };

        // Handler para próxima ronda
        const handleNextRound = () => {
            console.log('➡️ Próxima ronda');
        };

        // Handler para replay (jogar novamente com scores)
        const handleGameReplay = () => {
            console.log('🔄 Jogo reiniciado (scores mantidos)');
        };

        // Registar listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('error', handleSocketError); // Novo listener para erros de lógica
        socket.on('game_state', handleGameState);
        socket.on('player_joined', handlePlayerJoined);
        socket.on('player_disconnected', handlePlayerDisconnected);
        socket.on('attack_executed', handleAttackExecuted);
        socket.on('round_result', handleRoundResult);
        socket.on('game_reset', handleGameReset);
        socket.on('game_replay', handleGameReplay);
        socket.on('next_round_ready', handleNextRound);

        // Verificar estado inicial
        if (isConnected()) {
            setConnectionStatus('connected');
            setGameState(prev => ({ ...prev, connected: true }));
        }

        // Cleanup
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.off('error', handleSocketError);
            socket.off('game_state', handleGameState);
            socket.off('player_joined', handlePlayerJoined);
            socket.off('player_disconnected', handlePlayerDisconnected);
            socket.off('attack_executed', handleAttackExecuted);
            socket.off('round_result', handleRoundResult);
            socket.off('game_reset', handleGameReset);
            socket.off('game_replay', handleGameReplay);
            socket.off('next_round_ready', handleNextRound);
        };
    }, []);

    // ===== AÇÕES DO JOGO =====

    /**
     * Entrar na sessão de jogo
     * @param {Object} theme - Tema selecionado
     * @param {string} userRole - 'attacker' ou 'defender'
     * @param {string} [customSessionId] - ID da sala opcional
     */
    const joinGame = useCallback((theme, userRole, customSessionId = null) => {
        if (!socket.connected) {
            console.warn('⚠️ Socket desconectado. A tentar reconectar...');
            socket.connect();
        }

        // Usar ID passado, ou o atual do estado, ou gerar novo
        const finalSessionId = customSessionId || gameState.sessionId || `game_${Date.now()}`;

        console.log(`🎮 A entrar como ${userRole} na sessão ${finalSessionId}`);

        // Atualizar estado local imediatamente
        setGameState(prev => ({
            ...prev,
            sessionId: finalSessionId,
            role: userRole,
            activeTheme: theme,
            activeThemeId: theme?.id || null, // Safety check for Auto-Join (theme is null initially)
            playedThemes: prev.playedThemes, // Manter histórico
            themeRoundCount: prev.themeRoundCount // Manter contagem
        }));

        socket.emit('join_game', {
            sessionId: finalSessionId,
            role: userRole,
            theme: theme,
            userId: PERMANENT_USER_ID
        });
    }, [gameState.sessionId]);

    /**
     * Iniciar jogo com tema
     * @param {Object} theme - Tema do jogo
     * @param {string} [roleOverride] - Papel opcional
     * @param {string} [sessionId] - ID da sala opcional
     */
    const startGame = useCallback((theme, roleOverride = null, sessionId = null) => {
        const currentRole = roleOverride || roleRef.current;

        // Atualizar estado local para refletir a intenção imediatamente
        setGameState(prev => ({
            ...prev,
            activeThemeId: theme.id,
            activeTheme: theme,
            gameStatus: GameStatus.READY,
            role: currentRole || prev.role,
            sessionId: sessionId || prev.sessionId
        }));

        console.log(`🎮 A iniciar jogo com tema ${theme.id} e papel ${currentRole}`);

        // Emitir evento de início com tema, papel e ID da sessão
        // Isto garante que a sessão é criada/recuperada no servidor se necessário
        const finalSessionId = sessionId || prev.sessionId;
        socket.emit('start_game', {
            theme,
            role: currentRole,
            sessionId: finalSessionId,
            userId: PERMANENT_USER_ID
        });
    }, []);

    /**
     * Atacante executa ataque
     * @param {string} toolId - ID da ferramenta de ataque
     */
    const executeAttack = useCallback((toolId) => {
        console.log(`⚔️ Executar ataque: ${toolId}`);

        socket.emit('execute_attack', { toolId });

        // Atualização otimista local
        setGameState(prev => ({
            ...prev,
            attackerTool: toolId,
            defenderTool: null,
            startTime: Date.now(),
            gameStatus: GameStatus.ATTACKING,
            roundNumber: prev.roundNumber + 1
        }));
    }, []);

    /**
     * Defensor executa defesa
     * @param {string} toolId - ID da ferramenta de defesa
     * @param {boolean} isCorrect - Se a defesa está correta
     * @param {number} timeRemaining - Tempo restante em segundos
     */
    const executeDefense = useCallback((toolId, isCorrect, timeRemaining = 0) => {
        console.log(`🛡️ Executar defesa: ${toolId} (Correto: ${isCorrect})`);

        socket.emit('execute_defense', {
            toolId,
            isCorrect,
            timeRemaining
        });

        // Atualização otimista local
        setGameState(prev => ({
            ...prev,
            defenderTool: toolId,
            endTime: Date.now(),
            gameStatus: isCorrect ? GameStatus.DEFENDED : GameStatus.BREACHED
        }));
    }, []);

    /**
     * Tempo esgotado
     */
    const timeExpired = useCallback(() => {
        console.log('⏱️ Tempo esgotado');

        socket.emit('time_expired');

        setGameState(prev => ({
            ...prev,
            endTime: Date.now(),
            gameStatus: GameStatus.BREACHED
        }));
    }, []);

    /**
     * Reiniciar jogo
     */
    const resetGame = useCallback(() => {
        console.log('🔄 Reiniciar jogo');

        socket.emit('reset_game');

        setGameState(createInitialState());
    }, []);

    /**
     * Nova ronda
     */
    const nextRound = useCallback(() => {
        console.log('➡️ Próxima ronda');

        socket.emit('next_round');

        setGameState(prev => ({
            ...prev,
            gameStatus: GameStatus.READY,
            attackerTool: null,
            defenderTool: null,
            startTime: null,
            endTime: null,
            responseTime: null
        }));
    }, []);

    /**
     * Jogar novamente mantendo pontuações
     */
    const replayGame = useCallback(() => {
        console.log('🔄 Replay jogo (manter scores)');

        socket.emit('replay_game');

        setGameState(prev => ({
            ...prev,
            gameStatus: GameStatus.READY,
            attackerTool: null,
            defenderTool: null,
            startTime: null,
            endTime: null,
            responseTime: null,
            roundNumber: 0,
            streak: 0
            // Manter: attackerScore, defenderScore, totalRounds, history
        }));
    }, []);

    /**
     * Escolher próximo papel (apenas vencedor)
     * @param {string} role - 'attacker' ou 'defender'
     */
    const chooseNextRole = useCallback((role) => {
        console.log(`🔀 Escolher próximo papel: ${role}`);
        socket.emit('choose_next_role', { role, userId: PERMANENT_USER_ID });
    }, []);

    /**
     * Solicitar estado atual do servidor
     */
    const requestState = useCallback(() => {
        socket.emit('request_state');
    }, []);

    /**
     * Desconectar do servidor
     */
    const disconnect = useCallback(() => {
        disconnectSocket();
        setGameState(createInitialState());
    }, []);

    return {
        // Estado
        gameState,
        connectionStatus,
        isConnected: gameState.connected,

        // Ações
        joinGame,
        startGame,
        executeAttack,
        executeDefense,
        timeExpired,
        resetGame,
        replayGame,
        nextRound,
        chooseNextRole,
        requestState,
        disconnect,
        mySocketId: socket?.id,
        myUserId: PERMANENT_USER_ID,

        // Constantes
        GameStatus
    };
}

export default useCyberSync;
