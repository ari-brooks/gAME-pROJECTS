import React, { useEffect, useRef, useCallback } from 'react';
import {
  Player, Platform, Enemy, Shard, Ripple, LightSource,
  LevelUpFragment, Star, GameState, ComboState, FloatingLabel,
  MilestoneState, RunStats,
} from '../types/game';
import { COLORS, COLORBLIND_COLORS, PHYSICS, UPGRADE_LIMITS, GHOST_DELAY } from '../constants/game';
import { createPlayer, generateStars, spawnShatter, renderRipple, generateMorePlatforms } from '../game/entities';
import { updatePhysics, PhysicsState } from '../game/physics';
import { draw } from '../game/rendering';
import { GameSettings } from './SettingsScreen';

interface Props {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  settings: GameSettings;
  onRunComplete: (score: number, runStats: RunStats) => void;
  onRegisterJump?: (fn: () => void) => void;
  onRegisterPulse?: (fn: () => void) => void;
}

export default function GameCanvas({ gameState, setGameState, settings, onRunComplete, onRegisterJump, onRegisterPulse }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PhysicsState | null>(null);
  const animUpdateRef = useRef<number>(0);
  const animDrawRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const gameStateRef = useRef<'playing' | 'level_up' | 'dead'>('playing');
  const levelUpChoiceRef = useRef(0);
  const upgradeErrorTimerRef = useRef(0);
  const showGridRef = useRef(false);
  const runCompletedRef = useRef(false);

  const getColors = useCallback(() => settings.colorBlind ? COLORBLIND_COLORS : COLORS, [settings.colorBlind]);

  const initState = useCallback((canvas: HTMLCanvasElement): PhysicsState => {
    const colors = getColors();
    const player = createPlayer(canvas.height, colors.PLAYER);
    const platforms: Platform[] = [];
    const enemies: Enemy[] = [];
    const shards: Shard[] = [];
    const ripples: Ripple[] = [];
    const lightSources: LightSource[] = [];
    const levelUpFragments: LevelUpFragment[] = [];

    const startPlatform: Platform = {
      x: 50, y: canvas.height - 100, w: 200, h: 10,
      type: 'static', color: '#cccccc', isNeutral: true,
    };
    platforms.push(startPlatform);
    player.x = startPlatform.x + startPlatform.w / 2 - player.w / 2;
    player.y = startPlatform.y - player.h;
    player.grounded = true;
    player.hasLanded = true;

    const genState = {
      platforms, enemies, levelUpFragments,
      generationX: 0,
      platformsGeneratedCount: 0,
      score: 0,
      colors,
    };
    while (genState.generationX < canvas.width * 1.5) {
      generateMorePlatforms(genState);
    }

    return {
      player,
      platforms,
      enemies,
      shards,
      ripples,
      lightSources,
      levelUpFragments,
      keys: keysRef.current,
      cameraX: 0,
      cameraY: 0,
      gameTime: 0,
      screenShake: 0,
      glitchTimer: 0,
      canDoubleJump: false,
      positionHistory: [],
      score: 0,
      generationX: genState.generationX,
      platformsGeneratedCount: genState.platformsGeneratedCount,
      combo: { count: 0, timer: 0, multiplier: 1 },
      floatingLabels: [],
      milestone: { active: false, timer: 0, score: 0 },
      runStats: { score: 0, enemiesDefeated: 0, fragmentsCollected: 0, upgradesAcquired: 0, distanceTraveled: 0 },
      colors,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
  }, [getColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (stateRef.current) {
        stateRef.current.canvasWidth = canvas.width;
        stateRef.current.canvasHeight = canvas.height;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    stateRef.current = initState(canvas);
    runCompletedRef.current = false;
    gameStateRef.current = 'playing';

    const stars = generateStars(canvas.width, canvas.height);

    function doSetGameState(s: 'playing' | 'level_up' | 'dead') {
      gameStateRef.current = s;
      if (s === 'level_up') {
        levelUpChoiceRef.current = 0;
      }
      if (s === 'dead' && !runCompletedRef.current) {
        runCompletedRef.current = true;
        const state = stateRef.current;
        if (state) {
          state.runStats.score = state.score;
          onRunComplete(state.score, state.runStats);
        }
        setGameState('dead');
      }
    }

    function doGenerateMore() {
      const state = stateRef.current;
      if (!state) return;
      const genState = {
        platforms: state.platforms,
        enemies: state.enemies,
        levelUpFragments: state.levelUpFragments,
        generationX: state.generationX,
        platformsGeneratedCount: state.platformsGeneratedCount,
        score: state.score,
        colors: state.colors,
      };
      generateMorePlatforms(genState);
      state.generationX = genState.generationX;
      state.platformsGeneratedCount = genState.platformsGeneratedCount;
    }

    function updateLoop() {
      const state = stateRef.current;
      if (!state) { animUpdateRef.current = requestAnimationFrame(updateLoop); return; }
      if (gameStateRef.current === 'playing') {
        updatePhysics(state, doSetGameState, doGenerateMore);
      } else {
        if (gameStateRef.current !== 'dead') state.gameTime++;
      }
      animUpdateRef.current = requestAnimationFrame(updateLoop);
    }

    function drawLoop() {
      const state = stateRef.current;
      if (state) {
        draw({
          ctx,
          canvas,
          player: state.player,
          platforms: state.platforms,
          enemies: state.enemies,
          shards: state.shards,
          ripples: state.ripples,
          levelUpFragments: state.levelUpFragments,
          stars,
          positionHistory: state.positionHistory,
          cameraX: state.cameraX,
          cameraY: state.cameraY,
          gameTime: state.gameTime,
          glitchTimer: state.glitchTimer,
          screenShake: state.screenShake,
          gameState: gameStateRef.current,
          levelUpChoice: levelUpChoiceRef.current,
          upgradeErrorTimer: upgradeErrorTimerRef.current,
          colors: state.colors,
          showGrid: showGridRef.current,
          combo: state.combo,
          floatingLabels: state.floatingLabels,
          milestone: state.milestone,
          score: state.score,
          personalBest: 0,
        });
      }
      animDrawRef.current = requestAnimationFrame(drawLoop);
    }

    updateLoop();
    drawLoop();

    return () => {
      cancelAnimationFrame(animUpdateRef.current);
      cancelAnimationFrame(animDrawRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initState, onRunComplete, setGameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'KeyG') { showGridRef.current = !showGridRef.current; return; }

      if (gameStateRef.current === 'level_up') {
        if (e.code === 'ArrowUp') levelUpChoiceRef.current = (levelUpChoiceRef.current - 1 + 3) % 3;
        if (e.code === 'ArrowDown') levelUpChoiceRef.current = (levelUpChoiceRef.current + 1) % 3;
        if (e.code === 'Enter' || e.code === 'Space') {
          handleUpgradeSelect(levelUpChoiceRef.current);
        }
        return;
      }

      if (e.code === 'KeyQ') {
        restartGame(canvas);
        return;
      }

      keysRef.current[e.code] = true;

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        triggerJump();
      }
      if (e.code === 'KeyR') {
        triggerPulse();
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      keysRef.current[e.code] = false;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  function triggerJump() {
    const state = stateRef.current;
    if (!state || gameStateRef.current !== 'playing') return;
    const { player } = state;
    if (player.grounded) {
      if (player.onPlatform && player.onPlatform.type === 'rotating') {
        const p = player.onPlatform;
        const centerX = p.x + p.w / 2;
        const centerY = p.y + p.h / 2;
        const dx = (player.x + player.w / 2) - centerX;
        const dy = (player.y + player.h / 2) - centerY;
        player.vx += -dy * (p.rotationSpeed || 0.02) * 2.5;
        player.vy += dx * (p.rotationSpeed || 0.02);
      }
      player.vy = PHYSICS.JUMP_FORCE * (1 + player.upgrades.aero * 0.1);
      player.grounded = false;
      player.hasLanded = false;
      player.onPlatform = null;
      state.canDoubleJump = true;
      player.scaleX = 0.6;
      player.scaleY = 1.4;
      renderRipple(player.x + player.w / 2, player.y + player.h, 300, state.colors.PLAYER, state.ripples);
      spawnShatter(player.x + player.w / 2, player.y + player.h / 2, 10, state.colors.PLAYER, state.shards);
      player.rotation = Math.random() * Math.PI * 2;
    } else if (state.canDoubleJump) {
      player.vy = PHYSICS.JUMP_FORCE * 0.8;
      state.canDoubleJump = false;
      player.hasLanded = false;
      player.onPlatform = null;
      player.scaleX = 0.7;
      player.scaleY = 1.3;
      renderRipple(player.x + player.w / 2, player.y + player.h / 2, 150, 'rgba(0, 170, 255, 0.5)', state.ripples);
      spawnShatter(player.x + player.w / 2, player.y + player.h / 2, 10, state.colors.PLAYER, state.shards);
    }
  }

  function triggerPulse() {
    const state = stateRef.current;
    if (!state || gameStateRef.current !== 'playing') return;
    const { player, enemies, shards, ripples } = state;
    if (player.upgrades.pulse === 0) return;
    const PULSE_RADIUS = 300;
    renderRipple(player.x + player.w / 2, player.y + player.h / 2, PULSE_RADIUS, state.colors.PLAYER, ripples);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dist = Math.hypot(
        (player.x + player.w / 2) - (e.x + e.w / 2),
        (player.y + player.h / 2) - (e.y + e.h / 2)
      );
      if (dist < PULSE_RADIUS) {
        enemies.splice(i, 1);
        spawnShatter(e.x + e.w / 2, e.y + e.h / 2, 10, state.colors.ENEMY, shards);
      }
    }
  }

  function handleUpgradeSelect(choice: number) {
    const state = stateRef.current;
    if (!state) return;
    const { player } = state;
    let upgraded = false;
    if (choice === 0 && player.upgrades.aero < UPGRADE_LIMITS.aero) {
      player.upgrades.aero++; upgraded = true;
    } else if (choice === 1 && player.upgrades.vital < UPGRADE_LIMITS.vital) {
      player.upgrades.vital++; player.maxHealth++; player.health++; upgraded = true;
    } else if (choice === 2 && player.upgrades.pulse < UPGRADE_LIMITS.pulse) {
      player.upgrades.pulse++; upgraded = true;
    }
    if (upgraded) {
      player.vertices = 3 + player.upgrades.aero + player.upgrades.vital + player.upgrades.pulse;
      state.runStats.upgradesAcquired++;
      gameStateRef.current = 'playing';
    } else {
      upgradeErrorTimerRef.current = 30;
    }
  }

  function restartGame(canvas: HTMLCanvasElement) {
    stateRef.current = initState(canvas);
    runCompletedRef.current = false;
    gameStateRef.current = 'playing';
    setGameState('playing');
  }

  useEffect(() => {
    onRegisterJump?.(triggerJump);
    onRegisterPulse?.(triggerPulse);
  });

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      onTouchStart={(e) => {
        e.preventDefault();
        if (gameStateRef.current === 'level_up') {
          handleUpgradeSelect(levelUpChoiceRef.current);
        }
      }}
      style={{ touchAction: 'none' }}
    />
  );
}

export { };
