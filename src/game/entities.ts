import { Player, Enemy, Platform, Shard, Ripple, LevelUpFragment, Star, LightSource, BombPickup } from '../types/game';
import { COLORS, PHYSICS } from '../constants/game';
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
  generationX: number;
  platformsGeneratedCount: number;
  score: number;
  colors: typeof COLORS;
}

export function generateMorePlatforms(state: GenerationState): void {
  const { platforms, enemies, levelUpFragments, bombPickups, colors } = state;

  for (let i = 0; i < 5; i++) {
    const lastPlatform = platforms[platforms.length - 1];
    if (!lastPlatform) return;

    state.platformsGeneratedCount++;
    let newPlatform: Platform | null = null;
    let attempts = 0;
    let intersects = false;

    do {
      const xGap = randomBetween(100, 350);
      const x = lastPlatform.x + lastPlatform.w + xGap;

      let yGap =
        state.platformsGeneratedCount <= 3
          ? 120
          : randomBetween(120, 280);
      if (state.platformsGeneratedCount > 3 && state.platformsGeneratedCount % 5 === 0) {
        yGap = 350;
      }
      const y = lastPlatform.y - yGap;

      let type: Platform['type'] = 'static';
      let w = randomBetween(100, 250);

      if (state.platformsGeneratedCount <= 3) {
        type = 'static';
        w = 200;
      } else {
        const platformTypes: Platform['type'][] = [
          'static', 'static', 'static', 'crumble',
        ];
        type = platformTypes[Math.floor(Math.random() * platformTypes.length)];
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

      const difficulty = Math.min(0.8, 0.25 + state.score / 5000);
      if (state.platformsGeneratedCount > 3 && Math.random() < difficulty) {
        const speed = randomBetween(0.75, 1.75) + state.score / 4000;
        const isMidAir = Math.random() < 0.3;

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
      if (Math.random() < 0.2) {
        levelUpFragments.push({
          x: newPlatform.x + newPlatform.w / 2,
          y: newPlatform.y - 80,
          w: 25,
          h: 25,
        });
      }
      if (state.platformsGeneratedCount > 3 && Math.random() < 0.12) {
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
