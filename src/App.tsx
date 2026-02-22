import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RunStats } from './types/game';
import { savePlayerName, saveScore, getPersonalBest } from './services/database';
import GameCanvas from './components/GameCanvas';
import MainMenuScreen from './components/MainMenuScreen';
import NameEntryScreen from './components/NameEntryScreen';
import DeathScreen from './components/DeathScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import SettingsScreen, { GameSettings } from './components/SettingsScreen';
import TouchControls from './components/TouchControls';

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  colorBlind: false,
};

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem('echorun_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export default function App() {
  const [screen, setScreen] = useState<GameState>('menu');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('echorun_name') || '');
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('echorun_id') || '');
  const [personalBest, setPersonalBest] = useState(0);
  const [lastRunStats, setLastRunStats] = useState<RunStats>({
    score: 0, enemiesDefeated: 0, fragmentsCollected: 0, upgradesAcquired: 0, distanceTraveled: 0,
  });
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [gameKey, setGameKey] = useState(0);
  const isTouchDevice = typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  const jumpRef = useRef<() => void>(() => {});
  const pulseRef = useRef<() => void>(() => {});

  const isFirstTime = !playerName;

  useEffect(() => {
    if (playerId) {
      getPersonalBest(playerId).then(pb => setPersonalBest(pb));
    }
  }, [playerId]);

  async function handleNameEntry(name: string) {
    setPlayerName(name);
    localStorage.setItem('echorun_name', name);
    const id = await savePlayerName(name);
    if (id) {
      setPlayerId(id);
      localStorage.setItem('echorun_id', id);
    }
    setScreen('menu');
  }

  function handlePlay() {
    setGameKey(k => k + 1);
    setScreen('playing');
  }

  const personalBestRef = useRef(personalBest);
  useEffect(() => { personalBestRef.current = personalBest; }, [personalBest]);
  const playerIdRef = useRef(playerId);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

  const handleRunComplete = useCallback(async (score: number, runStats: RunStats) => {
    setLastRunStats({ ...runStats, score });
    if (score > personalBestRef.current) setPersonalBest(score);
    if (playerIdRef.current) {
      await saveScore(playerIdRef.current, score, { ...runStats, score });
    }
  }, []);

  function handleDeathPlayAgain() {
    setGameKey(k => k + 1);
    setScreen('playing');
  }

  function handleDeathMenu() {
    setScreen('menu');
  }

  const handleSetGameState = useCallback((s: GameState) => {
    if (s === 'dead') setScreen('dead');
    else if (s === 'playing') setScreen('playing');
    else if (s === 'level_up') setScreen('level_up');
  }, []);

  if (isFirstTime && screen === 'menu') {
    return (
      <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] relative">
        <NameEntryScreen onComplete={handleNameEntry} />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] relative" style={{ fontFamily: 'monospace' }}>
      {screen === 'menu' && (
        <MainMenuScreen
          playerName={playerName}
          personalBest={personalBest}
          onPlay={handlePlay}
          onLeaderboard={() => setScreen('leaderboard')}
          onSettings={() => setScreen('settings')}
        />
      )}

      {(screen === 'playing' || screen === 'level_up' || screen === 'dead') && (
        <>
          <div className="w-full h-full">
            <GameCanvas
              key={gameKey}
              gameState={screen}
              setGameState={handleSetGameState}
              settings={settings}
              onRunComplete={handleRunComplete}
              onRegisterJump={fn => { jumpRef.current = fn; }}
              onRegisterPulse={fn => { pulseRef.current = fn; }}
            />
          </div>

          {isTouchDevice && screen !== 'dead' && (
            <TouchControls
              onJump={() => jumpRef.current()}
              onPulse={() => pulseRef.current()}
              gameState={screen}
            />
          )}

          {screen === 'dead' && (
            <DeathScreen
              score={lastRunStats.score}
              personalBest={personalBest}
              runStats={lastRunStats}
              onPlayAgain={handleDeathPlayAgain}
              onLeaderboard={() => setScreen('leaderboard')}
              onMenu={handleDeathMenu}
            />
          )}
        </>
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          playerId={playerId}
          playerName={playerName}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onUpdate={setSettings}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
