import { useState, useEffect } from 'react';
import { useCyberSync, GameStatus } from './hooks/useCyberSync';
import cenarios from './data/cenarios.json';
import EntryScreen from './components/EntryScreen';
import AttackerDashboard from './components/AttackerDashboard';
import DefenderDashboard from './components/DefenderDashboard';
import FeedbackScreen from './components/FeedbackScreen';

function App() {
  const [role, setRole] = useState(null);
  const [localTheme, setLocalTheme] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isChoosingNewTheme, setIsChoosingNewTheme] = useState(false);

  const {
    gameState,
    startGame,
    executeAttack,
    executeDefense,
    timeExpired,
    resetGame,
    replayGame,
    nextRound,
    chooseNextRole,
    joinGame, // Necessário importar joinGame
    mySocketId,
    myUserId
  } = useCyberSync(role); // Passar role inicial, mas estado interno gere

  // Sincronizar role com o servidor (Server Authority)
  useEffect(() => {
    if (!gameState?.players || !mySocketId) {
      console.log('⏳ Sync Check Skipped:', { players: !!gameState?.players, mySocketId });
      return;
    }

    const isServerAttacker = gameState.players.attacker?.id === mySocketId;
    const isServerDefender = gameState.players.defender?.id === mySocketId;

    console.log('🔍 Sync Check:', {
      role,
      mySocketId,
      serverAttacker: gameState.players.attacker?.id,
      serverDefender: gameState.players.defender?.id,
      isServerAttacker,
      isServerDefender
    });

    if (isServerAttacker && role !== 'attacker') {
      console.log('🔄 Sync Rule: Switching to Attacker');
      setRole('attacker');
      setShowFeedback(false); // Hide feedback -> Start next round UI
    } else if (isServerDefender && role !== 'defender') {
      console.log('🔄 Sync Rule: Switching to Defender');
      setRole('defender');
      setShowFeedback(false); // Hide feedback -> Start next round UI
    }
  }, [gameState.players, mySocketId, role]);

  // O tema vem do estado partilhado OU do local, exceto se estivermos a escolher novo
  const selectedTheme = !isChoosingNewTheme ? (gameState.activeTheme || localTheme ||
    (gameState.activeThemeId ? cenarios.temas.find(t => t.id === gameState.activeThemeId) : null)) : null;

  // Handler para iniciar o jogo (vêm do EntryScreen)
  const handleStart = (selectedRole, theme, roomId) => {
    setRole(selectedRole);
    setLocalTheme(theme);
    setIsChoosingNewTheme(false);

    // Importante: Passar roomId se existir
    startGame(theme, selectedRole, roomId); // Emit start_game
    setShowFeedback(false);
  };

  // Handler para juntar-se a uma sessão (Guest Mode)
  const handleJoin = (roomId) => {
    // Join as Guest (Auto Role/Theme)
    setIsChoosingNewTheme(false);

    // Chamamos joinGame com null para role/theme para trigger auto-assign no server
    // O useCyberSync.js já expõe joinGame
    // Mas precisamos de garantir que o hook joinGame aceita nulls e os envia
    // joinGame(theme, userRole, customSessionId)
    // Vou assumir que o hook joinGame está exposto no return do useCyberSync
    joinGame(null, null, roomId);
  };

  // Atacante executa ataque
  const handleAttack = (toolId) => {
    executeAttack(toolId);
  };

  // Defensor executa defesa
  const handleDefend = (toolId, isCorrect, timeRemaining) => {
    executeDefense(toolId, isCorrect, timeRemaining);
    setShowFeedback(true);
  };

  // Tempo esgotado
  const handleTimeExpired = () => {
    timeExpired();
    setShowFeedback(true);
  };

  // Jogar novamente (neste caso, escolher novo tema)
  const handleNewTheme = () => {
    setIsChoosingNewTheme(true);
    setLocalTheme(null);
    setShowFeedback(false);
  };

  // Jogar novamente (apenas reseta feedback, usado internamente se necessário)
  const handlePlayAgain = () => {
    replayGame();
    setShowFeedback(false);
  };

  // Verificar se o jogo acabou
  const isGameOver = gameState.gameStatus === GameStatus.DEFENDED ||
    gameState.gameStatus === GameStatus.BREACHED;

  // Mostrar feedback automaticamente quando jogo termina
  useEffect(() => {
    if (isGameOver && selectedTheme && role) {
      setShowFeedback(true);
    }
  }, [isGameOver, selectedTheme, role]);

  // Se o jogo acabou e temos feedback (mas não se tivermos completado o tema e avançado)
  if (isGameOver && showFeedback && selectedTheme && gameState.gameStatus !== GameStatus.THEME_COMPLETED) {
    return (
      <FeedbackScreen
        theme={selectedTheme}
        gameState={gameState}
        role={role}
        onPlayAgain={handleNewTheme} // Fallback local
        onNextRound={nextRound} // Avança para THEME_COMPLETED na R3
        onChooseRole={chooseNextRole}
        currentUserId={myUserId}
      />
    );
  }

  // 1. Ecrã de Jogo (Ataque/Defesa)
  if (gameState.gameStatus === GameStatus.ATTACKING || gameState.gameStatus === GameStatus.READY) {
    if (role === 'attacker') {
      return (
        <AttackerDashboard
          theme={selectedTheme}
          onAttack={handleAttack}
          gameState={gameState}
        />
      );
    } else {
      return (
        <DefenderDashboard
          theme={selectedTheme}
          onDefend={handleDefend}
          gameState={gameState}
          onTimeExpired={handleTimeExpired}
        />
      );
    }
  }

  // 2. Ecrã de Fim de Jogo (Resultados Globais)
  if (gameState.gameStatus === GameStatus.GAME_FINISHED) {
    return (
      <EntryScreen
        playedThemes={gameState.playedThemes}
        currentSessionId={gameState.sessionId}
        canSelect={true} // Pode ver o ecrã
        initialRole={role}
        // Game Over Props
        globalWinner={gameState.globalWinnerUserId}
        finalScores={gameState.finalScores}
        myUserId={myUserId}
      />
    );
  }

  // 3. Ecrã de Espera (LOBBY) - Se já temos role mas ainda estamos em LOBBY
  if (gameState.gameStatus === GameStatus.LOBBY && role && gameState.sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 cyber-grid relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-0"></div>
        <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
          <div className="w-24 h-24 mb-8 relative">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-slate-800 rounded-full flex items-center justify-center text-4xl">⏳</div>
          </div>

          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4">
            A AGUARDAR OPONENTE
          </h2>

          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 w-full mb-6 backdrop-blur">
            <p className="text-slate-400 font-mono text-sm mb-2">Partilha este código:</p>
            <div className="text-5xl font-orbitron font-bold text-white tracking-widest mb-2">
              {gameState.sessionId}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              O outro jogador deve inserir este código para entrar.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="text-slate-500 hover:text-white font-mono text-sm underline transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // 4. Ecrã de Seleção (Lobby Inicial, Novo Tema, ou Entrada)
  // Se estamos em LOBBY, THEME_COMPLETED ou sem tema ativo, usamos EntryScreen.
  return (
    <EntryScreen
      onStart={handleStart}
      onJoin={handleJoin}
      playedThemes={gameState.playedThemes}
      currentSessionId={gameState.sessionId}
      initialRole={role}

      // Controla quem pode selecionar o tema
      canSelect={(function () {
        if (gameState.gameStatus === GameStatus.LOBBY) return true; // Ambos podem iniciar
        if (gameState.gameStatus === GameStatus.THEME_COMPLETED) {
          // Vencedor do tema escolhe
          if (gameState.themeWinnerUserId && myUserId) {
            return gameState.themeWinnerUserId === myUserId;
          }
          // Fallback: Vencedor da última ronda
          const lastRound = gameState.history?.slice(-1)[0];
          if (lastRound) return role === lastRound.winner;
        }
        return true; // Default (ex: primeira vez)
      })()}

      // Passar props de vencedor para mostrar overlay "A aguardar" correto
      globalWinner={gameState.themeWinnerUserId} // Reutilizar prop para mostrar quem ganhou o TEMA se necessário (opcional)
    />
  );
}

export default App;
