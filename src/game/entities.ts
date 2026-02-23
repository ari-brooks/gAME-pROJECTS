import { Player, Enemy, Platform, Shard, Ripple, LevelUpFragment, Star, LightSource, BombPickup, HeartPickup } from '../types/game';
import { COLORS } from '../constants/game';
import { getTierDefinition, scoreToLevel } from '../constants/levels';
import { rectIntersect, randomBetween } from '../utils/math';

export function createPlayer(canvasHeight: number, color: string = COLORS.PLAYER): Player {
  return {
    x: 100,
    y: canvasHeight - 200,
    vx: 0,
    vy: 0,
    w: 25,
    h: 25,
    scaleX: 1,
    scaleY: 1,
    health: 3,
    maxHealth: 3,
    invincibleTimer: 0,
    grounded: false,
    upgrades: { aero: 0, vital: 0, pulse: 0 },
    vertices: 3,
    rotation: 0,
    onPlatformType: null,
    onPlatform: null,
    relativeAngle: 0,
    relativeDist: 0,
    hasLanded: false,
    color,
    platformLastX: 0,
    platformLastY: 0,
    airJumpsRemaining: 0,
    isGroundPounding: false,
    bombs: 0,
  };
}

export function generateStars(canvasWidth: number, canvasHeight: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * canvasWidth * 2,
      y: Math.random() * canvasHeight,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.2 + 0.1,
      opacity: Math.random() * 0.5 + 0.2,
    });
  }
  return stars;
}

export function spawnShatter(
  x: number,
  y: number,
  count: number,
  color: string,
  shards: Shard[]
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    shards.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 45,
      type: 'shatter',
      color,
    });
  }
}

export function renderRipple(
  x: number,
  y: number,
  maxRadius: number,
  color: string,
  ripples: Ripple[]
): void {
  ripples.push({ x, y, radius: 0, maxRadius, life: 1.0, color });
}

interface GenerationState {
  platforms: Platform[];
  enemies: Enemy[];
  levelUpFragments: LevelUpFragment[];
  bombPickups: BombPickup[];
  heartPickups: HeartPickup[];
  generationX: number;
  platformsGeneratedCount: number;
  score: number;
  colors: typeof COLORS;
}

export function generateMorePlatforms(state: GenerationState): void {
  const { platforms, enemies, levelUpFragments, bombPickups, heartPickups, colors } = state;
  const level = scoreToLevel(state.score);
  const tier = getTierDefinition(level);

  for (let i = 0; i < 5; i++) {
    const lastPlatform = platforms[platforms.length - 1];
    if (!lastPlatform) return;

    state.platformsGeneratedCount++;
    let newPlatform: Platform | null = null;
    let attempts = 0;
    let intersects = false;

    do {
      const xGap = state.platformsGeneratedCount <= 3
        ? 80
        : randomBetween(tier.minXGap, tier.maxXGap);

      const x = lastPlatform.x + lastPlatform.w + xGap;

      let yGap: number;
      if (state.platformsGeneratedCount <= 3) {
        yGap = 100;
      } else if (state.platformsGeneratedCount % tier.challengeGapEvery === 0) {
        yGap = tier.challengeGapSize;
      } else {
        yGap = randomBetween(tier.minYGap, tier.maxYGap);
      }

      const y = lastPlatform.y - yGap;

      let type: Platform['type'] = 'static';
      const w = state.platformsGeneratedCount <= 3
        ? 200
        : randomBetween(tier.minPlatformWidth, tier.maxPlatformWidth);

      if (state.platformsGeneratedCount <= 3) {
        type = 'static';
      } else {
        const pool = tier.platformTypes as Platform['type'][];
        type = pool[Math.floor(Math.random() * pool.length)];
      }

      const h = 10;
      let color = colors.STATIC;

      newPlatform = { x, y, w, h, type, color, isPhasedOut: false };

      switch (type) {
        case 'static':
          newPlatform.color = colors.STATIC;
          break;
        case 'crumble':
          newPlatform.color = colors.CRUMBLE;
          break;
        case 'horizontal':
          newPlatform.color = colors.MOVING;
          newPlatform.speed = randomBetween(0.8, 2.0) * tier.enemySpeedMult;
          newPlatform.startX = x - 80;
          newPlatform.endX = x + 80;
          break;
        case 'vertical':
          newPlatform.color = colors.MOVING;
          newPlatform.speed = randomBetween(0.6, 1.5) * tier.enemySpeedMult;
          newPlatform.startY = y + 60;
          newPlatform.endY = y - 60;
          break;
        case 'rotating':
          newPlatform.color = colors.ROTATING;
          newPlatform.angle = 0;
          newPlatform.rotationSpeed = randomBetween(0.01, 0.03);
          break;
        case 'phasing':
          newPlatform.color = colors.PHASING;
          break;
        default:
          newPlatform.color = colors.STATIC;
          break;
      }

      if (Math.random() < 0.1) {
        newPlatform.color = colors.PLAYER;
      }

      intersects = false;
      for (const p of platforms) {
        if (rectIntersect(newPlatform, p)) {
          intersects = true;
          break;
        }
      }
      attempts++;
    } while (intersects && attempts < 20);

    if (!intersects && newPlatform) {
      platforms.push(newPlatform);

      if (state.platformsGeneratedCount > 3 && Math.random() < tier.enemySpawnBase) {
        const speed = randomBetween(0.75, 1.75) * tier.enemySpeedMult;
        const isMidAir = Math.random() < tier.midAirEnemyChance;

        if (isMidAir) {
          const midX = (lastPlatform.x + lastPlatform.w + newPlatform.x) / 2;
          const midY = (lastPlatform.y + newPlatform.y) / 2;
          enemies.push({
            x: midX - 12.5,
            y: midY - 12.5,
            w: 25,
            h: 25,
            vx: speed * (Math.random() > 0.5 ? 1 : -1),
            startX: midX - 50,
            endX: midX + 50,
            type: 'mid-air',
            baseY: midY - 12.5,
            hoverOffset: Math.random() * Math.PI * 2,
          });
        } else {
          enemies.push({
            x: newPlatform.x + newPlatform.w / 2 - 12.5,
            y: newPlatform.y - 25,
            w: 25,
            h: 25,
            vx: speed * (Math.random() > 0.5 ? 1 : -1),
            startX: newPlatform.x,
            endX: newPlatform.x + newPlatform.w,
            type: 'on-platform',
          });
        }
      }

      const fragmentChance = level <= 10 ? 0.22 : level <= 30 ? 0.18 : 0.14;
      if (Math.random() < fragmentChance) {
        levelUpFragments.push({
          x: newPlatform.x + newPlatform.w / 2,
          y: newPlatform.y - 80,
          w: 25,
          h: 25,
        });
      }

      const bombChance = level <= 10 ? 0.10 : level <= 40 ? 0.12 : level <= 70 ? 0.14 : 0.16;
      if (state.platformsGeneratedCount > 3 && Math.random() < bombChance) {
        bombPickups.push({
          x: newPlatform.x + newPlatform.w / 2 - 9,
          y: newPlatform.y - 55,
          w: 18,
          h: 18,
          collected: false,
        });
      }

      state.generationX = newPlatform.x + newPlatform.w;
    }
  }
}
