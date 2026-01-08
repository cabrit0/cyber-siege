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

// Estados do jogo (mantidos iguais para compatibilidade)
export const GameStatus = {
    LOBBY: 'LOBBY',           // Jogadores a selecionar
    READY: 'READY',           // Ambos prontos, a aguardar ataque
    ATTACKING: 'ATTACKING',   // Ataque em curso
    DEFENDED: 'DEFENDED',     // Defensor ganhou
    BREACHED: 'BREACHED'      // Atacante ganhou
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
     * Entrar numa sessão de jogo
     * @param {Object} theme - Tema do jogo
     * @param {string} playerRole - 'attacker' ou 'defender'
     * @param {string} sessionId - ID da sessão (opcional, gera um novo se não fornecido)
     */
    const joinGame = useCallback((theme, playerRole, sessionId = null) => {
        const sid = sessionId || `game_${Date.now()}`;

        console.log(`🎮 A entrar como ${playerRole} na sessão ${sid}`);

        socket.emit('join_game', {
            sessionId: sid,
            role: playerRole,
            theme
        });

        setGameState(prev => ({
            ...prev,
            sessionId: sid,
            role: playerRole,
            activeThemeId: theme?.id,
            activeTheme: theme
        }));

        return sid;
    }, []);

    /**
     * Iniciar jogo com tema (mantido para compatibilidade)
     * @param {Object} theme - Tema do jogo
     */
    const startGame = useCallback((theme) => {
        const currentRole = roleRef.current;
        if (currentRole) {
            return joinGame(theme, currentRole);
        }

        // Fallback: apenas emitir start_game
        socket.emit('start_game', { theme });

        setGameState(prev => ({
            ...prev,
            activeThemeId: theme.id,
            activeTheme: theme,
            gameStatus: GameStatus.READY
        }));
    }, [joinGame]);

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
        requestState,
        disconnect,

        // Constantes
        GameStatus
    };
}

export default useCyberSync;
