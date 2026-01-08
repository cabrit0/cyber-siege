/**
 * Cliente Socket.IO - Conexão única reutilizável
 * 
 * Este módulo estabelece uma conexão persistente com o servidor Socket.IO
 * e exporta a instância para ser usada em toda a aplicação.
 */

import { io } from 'socket.io-client';

// URL do servidor backend
// Em desenvolvimento: localhost:3001
// Em produção: alterar para o URL do servidor hospedado
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Criar instância única do socket
const socket = io(SERVER_URL, {
    // Não conectar automaticamente - conectar apenas quando necessário
    autoConnect: false,

    // Configurações de reconexão
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,

    // Timeout
    timeout: 20000,

    // Transports
    transports: ['websocket', 'polling']
});

// Logging de eventos de conexão (apenas em desenvolvimento)
if (import.meta.env.DEV) {
    socket.on('connect', () => {
        console.log('🔌 Socket conectado:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconectado após', attemptNumber, 'tentativas');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Tentativa de reconexão:', attemptNumber);
    });
}

/**
 * Conectar ao servidor
 */
export const connectSocket = () => {
    if (!socket.connected) {
        socket.connect();
    }
    return socket;
};

/**
 * Desconectar do servidor
 */
export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

/**
 * Verificar se está conectado
 */
export const isConnected = () => socket.connected;

/**
 * Obter ID do socket
 */
export const getSocketId = () => socket.id;

export default socket;
