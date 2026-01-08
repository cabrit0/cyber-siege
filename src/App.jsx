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

  const {
    gameState,
    joinGame,
    executeAttack,
    executeDefense,
    timeExpired,
    resetGame,
    nextRound
  } = useCyberSync();

  // O tema vem do estado partilhado OU do local
  const selectedTheme = gameState.activeTheme || localTheme ||
    (gameState.activeThemeId ? cenarios.temas.find(t => t.id === gameState.activeThemeId) : null);

  // Iniciar jogo
  // ID de sessão comum para todos os jogadores
  const SESSION_ID = 'cyber_siege_default';

  const handleStart = (selectedRole, theme) => {
    setRole(selectedRole);
    setLocalTheme(theme);
    // Usar joinGame com sessionId comum para ambos entrarem na mesma sala
    joinGame(theme, selectedRole, SESSION_ID);
    setShowFeedback(false);
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

  // Jogar novamente
  const handlePlayAgain = () => {
    resetGame();
    setRole(null);
    setLocalTheme(null);
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

  // Se o jogo acabou e temos feedback
  if (isGameOver && showFeedback && selectedTheme) {
    return (
      <FeedbackScreen
        theme={selectedTheme}
        gameState={gameState}
        role={role}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Ecrã de entrada se não tiver papel selecionado
  if (!role) {
    return <EntryScreen onStart={handleStart} />;
  }

  // Loading se tema não está disponível
  if (!selectedTheme) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-spin mb-4">⏳</div>
          <p className="text-slate-400 font-mono">A sincronizar...</p>
        </div>
      </div>
    );
  }

  // Dashboard do Atacante
  if (role === 'attacker') {
    return (
      <AttackerDashboard
        theme={selectedTheme}
        onAttack={handleAttack}
        gameState={gameState}
      />
    );
  }

  // Dashboard do Defensor
  return (
    <DefenderDashboard
      theme={selectedTheme}
      onDefend={handleDefend}
      gameState={gameState}
      onTimeExpired={handleTimeExpired}
    />
  );
}

export default App;
