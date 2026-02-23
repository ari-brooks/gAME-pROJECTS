import {
  Player,
  Platform,
  Enemy,
  Shard,
  Ripple,
  LevelUpFragment,
  LightSource,
  ComboState,
  FloatingLabel,
  MilestoneState,
  RunStats,
  Bomb,
  BombPickup,
  LevelState,
  HeartPickup,
} from '../types/game';
import { PHYSICS as PHYSICS_CONSTS, COLORS, COMBO_TIMEOUT, COMBO_MAX, MILESTONES } from '../constants/game';
import { scoreToLevel, getTierDefinition, levelProgressPercent, LEVEL_REWARDS, TIER_TRANSITION_LEVELS } from '../constants/levels';
import { spawnShatter, renderRipple } from './entities';
import { clamp } from '../utils/math';

export interface PhysicsState {
  player: Player;
  platforms: Platform[];
  enemies: Enemy[];
  shards: Shard[];
  ripples: Ripple[];
  lightSources: LightSource[];
  levelUpFragments: LevelUpFragment[];
  activeBombs: Bomb[];
  bombPickups: BombPickup[];
  heartPickups: HeartPickup[];
  keys: Record<string, boolean>;
  cameraX: number;
  cameraY: number;
  gameTime: number;
  screenShake: number;
  platformsGeneratedCount: number;
  glitchTimer: number;
  canDoubleJump: boolean;
  airJumpsRemaining: number;
  positionHistory: { x: number; y: number; rotation: number }[];
  score: number;
  generationX: number;
  combo: ComboState;
  floatingLabels: FloatingLabel[];
  milestone: MilestoneState;
  levelState: LevelState;
  runStats: RunStats;
  colors: typeof COLORS;
  canvasWidth: number;
  canvasHeight: number;
}

export function updatePhysics(
  state: PhysicsState,
  setGameState: (s: 'playing' | 'level_up' | 'dead') => void,
  generateMore: () => void
): void {
  state.gameTime++;
  state.positionHistory.push({ x: state.player.x, y: state.player.y, rotation: state.player.rotation });

  const { player, keys } = state;

  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.vx -= PHYSICS_CONSTS.ACCEL;
    if (player.grounded) player.vx *= 0.88;
  } else if (keys['ArrowRight'] || keys['KeyD']) {
    player.vx += PHYSICS_CONSTS.ACCEL;
    if (player.grounded) player.vx *= 0.88;
  } else {
    const friction = player.grounded && player.onPlatformType === 'ice' ? 0.99 : (player.grounded ? 0.75 : PHYSICS_CONSTS.FRICTION);
    player.vx *= friction;
  }
  player.vx = clamp(player.vx, -PHYSICS_CONSTS.MAX_SPEED, PHYSICS_CONSTS.MAX_SPEED);

  if ((keys['ArrowDown'] || keys['KeyS']) && !player.grounded && !player.isGroundPounding) {
    player.isGroundPounding = true;
    player.vx *= 0.3;
    player.vy = 22;
  }

  let currentGravity = PHYSICS_CONSTS.GRAVITY;
  if ((keys['Space'] || keys['ArrowUp']) && player.vy < 0 && !player.isGroundPounding) {
    currentGravity *= PHYSICS_CONSTS.JUMP_HOLD_GRAVITY_MULT;
  }
  if (player.isGroundPounding) {
    currentGravity *= 3.5;
  }
  player.vy += currentGravity;

  const wasGrounded = player.grounded;
  const lastPlatform = player.onPlatform;

  player.grounded = false;
  player.onPlatformType = null;

  if (wasGrounded && lastPlatform) {
    const platformDeltaX = lastPlatform.x - player.platformLastX;
    const platformDeltaY = lastPlatform.y - player.platformLastY;
    player.x += platformDeltaX;
    player.y += platformDeltaY;
  }

  player.x += player.vx;
  player.y += player.vy;

  const visiblePlatforms = state.platforms.filter(
    (p) => p.x + p.w > state.cameraX - 1000 && p.x < state.cameraX + state.canvasWidth + 1000
  );

  for (const p of visiblePlatforms) {
    if (p.isPhasedOut || p.isCollidable === false) continue;

    if (player.vy >= 0) {
      const nextY = player.y + player.h;
      const prevY = player.y + player.h - player.vy;
      const isWithinX = player.x < p.x + p.w && player.x + player.w > p.x;
      const isCrossingTop = prevY <= p.y + 5 && nextY >= p.y;

      if (isWithinX && isCrossingTop) {
        const impactVelocity = player.vy;
        player.y = p.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.onPlatform = p;
        player.platformLastX = p.x;
        player.platformLastY = p.y;

        if (p.type === 'rotating') {
          const centerX = p.x + p.w / 2;
          const centerY = p.y + p.h / 2;
          const dx = player.x + player.w / 2 - centerX;
          const dy = player.y + player.h / 2 - centerY;
          player.relativeDist = Math.sqrt(dx * dx + dy * dy);
          player.relativeAngle = Math.atan2(dy, dx) - (p.angle || 0);
        }

        if (player.isGroundPounding) {
          player.isGroundPounding = false;
          state.screenShake = 20;
          renderRipple(player.x + player.w / 2, p.y, 600, '#00ffff', state.ripples);
          spawnShatter(player.x + player.w / 2, p.y, 18, '#00ffff', state.shards);
          player.hasLanded = true;
        }

        if (!player.hasLanded) {
          renderRipple(player.x + player.w / 2, p.y, 400, p.color, state.ripples);
          const particleCount = Math.min(10, Math.floor(Math.abs(impactVelocity) * 5));
          spawnShatter(player.x + player.w / 2, p.y, particleCount, '#00ffff', state.shards);
          player.hasLanded = true;

          if (Math.abs(impactVelocity) > 12) state.screenShake = 15;

          const targetAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
          let currentRotation = player.rotation % (2 * Math.PI);
          if (currentRotation < 0) currentRotation += 2 * Math.PI;
          let closestTarget = targetAngles[0];
          let minDiff = Infinity;
          for (const target of targetAngles) {
            const diff = Math.abs(currentRotation - target);
            const currentMinDiff = Math.min(diff, 2 * Math.PI - diff);
            if (currentMinDiff < minDiff) {
              minDiff = currentMinDiff;
              closestTarget = target;
            }
          }
          player.rotation = closestTarget;
        }

        player.onPlatformType = p.type;
        state.canDoubleJump = false;
        state.airJumpsRemaining = 0;

        if (p.type === 'crumble' && !p.isCrumbling) {
          p.isCrumbling = true;
          p.collapseTimer = 30;
          p.originalColor = p.color;
        }
      }
    }
  }

  if (!player.grounded) {
    player.hasLanded = false;
  }

  updatePlatforms(state);

  if (player.grounded && player.onPlatform && player.onPlatform.type === 'rotating') {
    const p = player.onPlatform;
    const centerX = p.x + p.w / 2;
    const centerY = p.y + p.h / 2;
    const currentAngle = (p.angle || 0) + player.relativeAngle;
    player.x = centerX + Math.cos(currentAngle) * player.relativeDist - player.w / 2;
    player.y = centerY + Math.sin(currentAngle) * player.relativeDist - player.h / 2;
  }

  if (player.y > state.cameraY + state.canvasHeight + 100) player.health = 0;
  if (player.health <= 0) {
    setGameState('dead');
    spawnShatter(player.x + player.w / 2, player.y + player.h / 2, 10, state.colors.PLAYER, state.shards);
    renderRipple(player.x + player.w / 2, player.y + player.h / 2, 500, state.colors.ENEMY, state.ripples);
    return;
  }

  player.scaleX += (1 - player.scaleX) * 0.1;
  player.scaleY += (1 - player.scaleY) * 0.1;

  if (player.invincibleTimer > 0) player.invincibleTimer--;

  updateEnemies(state, setGameState);
  updateFragments(state, setGameState);
  updateBombPickups(state);
  updateHeartPickups(state);
  updateActiveBombs(state);
  updateCombo(state);
  updateMilestone(state);
  updateLevel(state);

  state.score = Math.max(state.score, Math.floor(player.x / 10));
  state.runStats.distanceTraveled = Math.floor(player.x / 10);

  if (player.x + state.canvasWidth > state.generationX) {
    generateMore();
  }

  state.platforms = state.platforms.filter((p) => p.x + p.w > state.cameraX);
  state.enemies = state.enemies.filter((e) => e.x + e.w > state.cameraX);
  state.levelUpFragments = state.levelUpFragments.filter((f) => f.x + f.w > state.cameraX);
  state.bombPickups = state.bombPickups.filter((b) => b.x + b.w > state.cameraX && !b.collected);
  state.heartPickups = state.heartPickups.filter((h) => h.x + h.w > state.cameraX && !h.collected);

  updateParticles(state);

  if (state.glitchTimer > 0) state.glitchTimer--;
  if (state.screenShake > 0) state.screenShake--;

  const targetCameraX = player.x - state.canvasWidth / 3;
  state.cameraX += (targetCameraX - state.cameraX) * 0.1;
  const targetCameraY = player.y - state.canvasHeight / 2;
  state.cameraY += (targetCameraY - state.cameraY) * 0.1;

  state.lightSources = [];

  state.floatingLabels = state.floatingLabels.filter((l) => l.life > 0);
  state.floatingLabels.forEach((l) => { l.y -= 0.8; l.life--; });
}

function updatePlatforms(state: PhysicsState): void {
  const { platforms, gameTime, cameraY, canvasHeight, shards } = state;
  platforms.forEach((p, i) => {
    if (p.type === 'rotating') {
      p.angle = ((p.angle || 0) + (p.rotationSpeed || 0.02));
    }
    if (p.type === 'horizontal' && p.speed !== undefined) {
      p.x += p.speed;
      if (p.x < (p.startX || 0) || p.x > (p.endX || 0)) p.speed *= -1;
    } else if (p.type === 'vertical' && p.speed !== undefined) {
      p.y += p.speed;
      if (p.y < (p.endY || 0) || p.y > (p.startY || 0)) p.speed *= -1;
    }

    if (p.type === 'crumble' && p.isCrumbling) {
      p.collapseTimer = (p.collapseTimer || 0) - 1;
      p.jitterX = (Math.random() - 0.5) * 2;
      p.jitterY = (Math.random() - 0.5) * 2;
      p.color = '#FF4500';

      if (gameTime % 10 === 0) {
        shards.push({
          x: p.x + Math.random() * p.w,
          y: p.y,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 2,
          life: 30,
          type: 'shatter',
          color: 'rgba(255, 69, 0, 0.5)',
        });
      }

      if ((p.collapseTimer || 0) <= 0) {
        p.isCollidable = false;
        p.vy = (p.vy || 0) + 0.5;
        p.y += p.vy || 0;
        p.jitterX = 0;
        p.jitterY = 0;
        if (p.y > cameraY + canvasHeight + 500) {
          platforms.splice(i, 1);
        }
      }
    }

    if (p.type === 'phasing') {
      const cycleFrames = 180;
      const sineValue = Math.sin(gameTime * (2 * Math.PI / cycleFrames));
      const frameInCycle = gameTime % cycleFrames;
      if (sineValue > 0) {
        p.isPhasedOut = false;
        p.opacity = 0.8;
        if (frameInCycle >= 60 && frameInCycle < 90) {
          p.opacity = gameTime % 4 < 2 ? 0.8 : 0.4;
        }
      } else {
        p.isPhasedOut = true;
        p.opacity = 0.2;
      }
    }
  });
}

function updateEnemies(
  state: PhysicsState,
  setGameState: (s: 'playing' | 'level_up' | 'dead') => void
): void {
  const { player, enemies, shards, ripples, gameTime, colors } = state;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x += e.vx;
    if (e.x < e.startX || e.x + e.w > e.endX) e.vx *= -1;

    if (e.type === 'mid-air') {
      e.y = (e.baseY || 0) + Math.sin(gameTime * 0.05 + (e.hoverOffset || 0)) * 75;
    }

    if (
      player.x < e.x + e.w &&
      player.x + player.w > e.x &&
      player.y < e.y + e.h &&
      player.y + player.h > e.y
    ) {
      if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 10) {
        enemies.splice(i, 1);
        player.vy = PHYSICS_CONSTS.JUMP_FORCE * 0.6;
        spawnShatter(e.x + e.w / 2, e.y + e.h / 2, 10, colors.ENEMY, shards);
        renderRipple(e.x, e.y, 300 + player.upgrades.pulse * 50, colors.ENEMY, ripples);
        state.runStats.enemiesDefeated++;

        state.combo.count++;
        state.combo.timer = COMBO_TIMEOUT;
        state.combo.multiplier = Math.min(COMBO_MAX, 1 + Math.floor(state.combo.count / 2));

        if (state.combo.count >= 2) {
          state.floatingLabels.push({
            x: e.x + e.w / 2,
            y: e.y,
            text: `x${state.combo.count} COMBO!`,
            life: 60,
            maxLife: 60,
            color: colors.ENEMY,
          });
        }

        const bonusScore = 10 * state.combo.multiplier;
        state.score += bonusScore;
      } else if (player.invincibleTimer <= 0) {
        player.health--;
        player.invincibleTimer = 60;
        state.glitchTimer = 10;
        player.vx = player.x < e.x ? -10 : 10;
        player.vy = -5;
        state.combo.count = 0;
        state.combo.multiplier = 1;
        state.combo.timer = 0;
      }
    }
  }
}

function updateFragments(
  state: PhysicsState,
  setGameState: (s: 'playing' | 'level_up' | 'dead') => void
): void {
  const { player, levelUpFragments } = state;
  for (let i = levelUpFragments.length - 1; i >= 0; i--) {
    const frag = levelUpFragments[i];
    if (
      player.x < frag.x + frag.w &&
      player.x + player.w > frag.x &&
      player.y < frag.y + frag.h &&
      player.y + player.h > frag.y
    ) {
      levelUpFragments.splice(i, 1);
      state.runStats.fragmentsCollected++;
      setGameState('level_up');
    }
  }
}

function updateCombo(state: PhysicsState): void {
  if (state.combo.timer > 0) {
    state.combo.timer--;
  } else {
    state.combo.count = 0;
    state.combo.multiplier = 1;
  }
}

function updateMilestone(state: PhysicsState): void {
  if (state.milestone.active) {
    state.milestone.timer--;
    if (state.milestone.timer <= 0) state.milestone.active = false;
    return;
  }
  for (const ms of MILESTONES) {
    if (state.score >= ms && !state.milestone.active) {
      const alreadyTriggered = (state as any)._triggeredMilestones?.includes(ms);
      if (!alreadyTriggered) {
        if (!(state as any)._triggeredMilestones) (state as any)._triggeredMilestones = [];
        (state as any)._triggeredMilestones.push(ms);
        state.milestone = { active: true, timer: 120, score: ms };
      }
    }
  }
}

function updateBombPickups(state: PhysicsState): void {
  const { player, bombPickups, shards, floatingLabels, colors } = state;
  for (let i = bombPickups.length - 1; i >= 0; i--) {
    const bp = bombPickups[i];
    if (
      player.x < bp.x + bp.w &&
      player.x + player.w > bp.x &&
      player.y < bp.y + bp.h &&
      player.y + player.h > bp.y
    ) {
      bp.collected = true;
      player.bombs++;
      spawnShatter(bp.x + bp.w / 2, bp.y + bp.h / 2, 8, '#ff6600', shards);
      floatingLabels.push({
        x: bp.x + bp.w / 2,
        y: bp.y,
        text: '+BOMB',
        life: 60,
        maxLife: 60,
        color: '#ff6600',
      });
    }
  }
}

const BOMB_BLAST_RADIUS = 80;

function triggerBombExplosion(state: PhysicsState, bx: number, by: number): void {
  const { player, enemies, shards, ripples, floatingLabels, colors } = state;

  state.screenShake = 25;
  renderRipple(bx, by, BOMB_BLAST_RADIUS * 3, '#ff6600', ripples);
  renderRipple(bx, by, BOMB_BLAST_RADIUS * 2, '#ffcc00', ripples);
  spawnShatter(bx, by, 24, '#ff6600', shards);
  spawnShatter(bx, by, 12, '#ffcc00', shards);

  let killCount = 0;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(ex - bx, ey - by);
    if (dist < BOMB_BLAST_RADIUS) {
      enemies.splice(i, 1);
      spawnShatter(ex, ey, 10, colors.ENEMY, shards);
      state.runStats.enemiesDefeated++;
      killCount++;

      state.combo.count++;
      state.combo.timer = COMBO_TIMEOUT;
      state.combo.multiplier = Math.min(COMBO_MAX, 1 + Math.floor(state.combo.count / 2));
      const bonusScore = 10 * state.combo.multiplier;
      state.score += bonusScore;
    }
  }

  if (killCount >= 2) {
    floatingLabels.push({
      x: bx,
      y: by - 20,
      text: `BOOM x${killCount}!`,
      life: 80,
      maxLife: 80,
      color: '#ff6600',
    });
  }

  const dx = (player.x + player.w / 2) - bx;
  const dy = (player.y + player.h / 2) - by;
  const playerDist = Math.hypot(dx, dy);

  if (playerDist < BOMB_BLAST_RADIUS * 2) {
    const proximity = 1 - playerDist / (BOMB_BLAST_RADIUS * 2);
    const rocketForce = PHYSICS_CONSTS.JUMP_FORCE * 2.0 * proximity;
    player.vy = Math.min(player.vy, rocketForce);
    if (dx !== 0) {
      player.vx += (dx / Math.abs(dx)) * 4 * proximity;
    }
    player.grounded = false;
    player.hasLanded = false;
    player.onPlatform = null;
  }
}

function updateActiveBombs(state: PhysicsState): void {
  const { activeBombs, platforms, cameraY, canvasHeight } = state;

  for (let i = activeBombs.length - 1; i >= 0; i--) {
    const bomb = activeBombs[i];
    if (bomb.exploded) { activeBombs.splice(i, 1); continue; }

    bomb.vy += PHYSICS_CONSTS.GRAVITY * 1.2;
    bomb.x += bomb.vx;
    bomb.y += bomb.vy;

    let exploded = false;

    if (bomb.vy >= 0) {
      for (const p of platforms) {
        if (p.isPhasedOut || p.isCollidable === false) continue;
        const nextY = bomb.y + bomb.h;
        const prevY = bomb.y + bomb.h - bomb.vy;
        const isWithinX = bomb.x < p.x + p.w && bomb.x + bomb.w > p.x;
        const isCrossingTop = prevY <= p.y + 5 && nextY >= p.y;
        if (isWithinX && isCrossingTop) {
          triggerBombExplosion(state, bomb.x + bomb.w / 2, bomb.y + bomb.h / 2);
          bomb.exploded = true;
          exploded = true;
          break;
        }
      }
    }

    if (!exploded && bomb.y > cameraY + canvasHeight + 300) {
      bomb.exploded = true;
    }

    if (bomb.exploded) activeBombs.splice(i, 1);
  }
}

function updateHeartPickups(state: PhysicsState): void {
  const { player, heartPickups, shards, floatingLabels, colors } = state;
  for (let i = heartPickups.length - 1; i >= 0; i--) {
    const hp = heartPickups[i];
    if (
      player.x < hp.x + hp.w &&
      player.x + player.w > hp.x &&
      player.y < hp.y + hp.h &&
      player.y + player.h > hp.y
    ) {
      hp.collected = true;
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + 1);
      } else {
        player.maxHealth++;
        player.health = player.maxHealth;
      }
      spawnShatter(hp.x + hp.w / 2, hp.y + hp.h / 2, 10, '#ff4444', shards);
      floatingLabels.push({
        x: hp.x + hp.w / 2,
        y: hp.y - 10,
        text: '+LIFE',
        life: 80,
        maxLife: 80,
        color: '#ff4444',
      });
      state.runStats.rewardsCollected++;
    }
  }
}

function updateLevel(state: PhysicsState): void {
  const ls = state.levelState;

  if (ls.levelUpTimer > 0) ls.levelUpTimer--;
  if (ls.tierTransitionTimer > 0) ls.tierTransitionTimer--;
  if (ls.rewardDisplayTimer > 0) {
    ls.rewardDisplayTimer--;
    return;
  }

  if (ls.pendingReward) {
    const reward = ls.pendingReward;
    const { player } = state;

    if (reward.type === 'life') {
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + reward.amount);
      } else {
        player.maxHealth += reward.amount;
        player.health = player.maxHealth;
      }
    } else if (reward.type === 'bomb') {
      player.bombs += reward.amount;
    } else if (reward.type === 'upgrade_fragment') {
      state.levelUpFragments.push({
        x: player.x + player.w / 2 + 60,
        y: player.y - 80,
        w: 25,
        h: 25,
      });
    } else if (reward.type === 'score_bonus') {
      state.score += reward.amount;
    }

    state.runStats.rewardsCollected++;
    state.floatingLabels.push({
      x: player.x + player.w / 2,
      y: player.y - 40,
      text: reward.label,
      life: 100,
      maxLife: 100,
      color: reward.color,
    });

    ls.pendingReward = null;
  }

  const newLevel = scoreToLevel(state.score);
  if (newLevel > ls.current) {
    const isTierTransition = TIER_TRANSITION_LEVELS.has(newLevel);
    ls.previousLevel = ls.current;
    ls.current = newLevel;
    ls.justLeveledUp = true;
    ls.levelUpTimer = isTierTransition ? 240 : 150;
    ls.isTierTransition = isTierTransition;
    if (isTierTransition) ls.tierTransitionTimer = 240;
    state.runStats.highestLevel = newLevel;

    const reward = LEVEL_REWARDS.find(r => r.level === newLevel && !ls.triggeredRewards.has(r.level));
    if (reward) {
      ls.triggeredRewards.add(reward.level);
      ls.pendingReward = { ...reward };
      ls.rewardDisplayTimer = 60;
    }

    if (isTierTransition) {
      state.screenShake = 12;
    }
  } else {
    ls.justLeveledUp = false;
  }
}

function updateParticles(state: PhysicsState): void {
  const { shards, ripples } = state;
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    if (s.type === 'shatter' || s.type === 'shockwave') {
      if (s.life > 15) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.95;
        s.vy *= 0.95;
      }
      s.life -= 1;
    } else {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.5;
      s.life -= 0.02;
    }
    if (s.life <= 0) shards.splice(i, 1);
  }
  ripples.forEach((r, i) => {
    r.radius += (r.maxRadius - r.radius) * 0.1;
    r.life -= 0.02;
    if (r.life < 0) ripples.splice(i, 1);
  });
}
