import {
  Player,
  Platform,
  Enemy,
  Shard,
  Ripple,
  LightSource,
  LevelUpFragment,
  Star,
  FloatingLabel,
  MilestoneState,
  ComboState,
} from '../types/game';
import { COLORS, GHOST_DELAY, UPGRADE_LIMITS } from '../constants/game';

export interface DrawState {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  player: Player;
  platforms: Platform[];
  enemies: Enemy[];
  shards: Shard[];
  ripples: Ripple[];
  lightSources: LightSource[];
  levelUpFragments: LevelUpFragment[];
  stars: Star[];
  positionHistory: { x: number; y: number; rotation: number }[];
  cameraX: number;
  cameraY: number;
  gameTime: number;
  glitchTimer: number;
  screenShake: number;
  gameState: string;
  levelUpChoice: number;
  upgradeErrorTimer: number;
  colors: typeof COLORS;
  showGrid: boolean;
  combo: ComboState;
  floatingLabels: FloatingLabel[];
  milestone: MilestoneState;
  score: number;
  personalBest: number;
}

export function draw(state: DrawState): void {
  const { ctx, canvas } = state;

  ctx.fillStyle = state.colors.BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars(state);

  const glitchX = state.glitchTimer > 0 ? (Math.random() - 0.5) * 20 : 0;
  const glitchY = state.glitchTimer > 0 ? (Math.random() - 0.5) * 20 : 0;
  ctx.save();
  ctx.translate(glitchX, glitchY);

  ctx.save();
  let shakeX = 0;
  let shakeY = 0;
  if (state.screenShake > 0) {
    shakeX = (Math.random() - 0.5) * state.screenShake;
    shakeY = (Math.random() - 0.5) * state.screenShake;
  }
  ctx.translate(-state.cameraX + shakeX, -state.cameraY + shakeY);

  const ghostIndex = state.positionHistory.length - GHOST_DELAY;
  if (ghostIndex > 0) {
    const pos = state.positionHistory[ghostIndex];
    if (pos) {
      drawVectorEntity(ctx, 'player', pos.x, pos.y, state.player.w, state.player.h, 1, 1, state.colors.GHOST, state.player.vertices, false, pos.rotation);
    }
  }

  const allLights = [
    ...state.ripples.map((r) => ({ x: r.x, y: r.y, radius: r.radius, alpha: r.life, color: r.color })),
    ...state.lightSources.map((ls) => ({ x: ls.x, y: ls.y, radius: ls.radius, alpha: 0.3, color: 'rgba(0, 255, 255, 0.2)' })),
    { x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2, radius: 850, alpha: 0.5, color: state.colors.NEON_BLUE },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  allLights.forEach((l) => {
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
    grad.addColorStop(0, l.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = l.alpha;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  allLights.forEach((l) => {
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, l.alpha);
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    state.platforms.forEach((p) => drawPlatform(ctx, p, state.gameTime));
    state.enemies.forEach((e) => drawVectorEntity(ctx, 'enemy', e.x, e.y, e.w, e.h, 1, 1, state.colors.ENEMY, 4, true));
    state.levelUpFragments.forEach((f) => drawVectorEntity(ctx, 'level_up', f.x, f.y, f.w, f.h, 1, 1, state.colors.LEVEL_UP, 4, true));
    ctx.restore();
  });

  const isFlickering = state.player.invincibleTimer > 0 && Math.floor(state.player.invincibleTimer / 5) % 2 === 0;
  if (!isFlickering) {
    drawVectorEntity(ctx, 'player', state.player.x, state.player.y, state.player.w, state.player.h, state.player.scaleX, state.player.scaleY, state.player.color, state.player.vertices, true, state.player.rotation);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  state.shards.forEach((s) => {
    if (s.type === 'shatter' || s.type === 'shockwave') {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.life > 15 ? 1.0 : s.life / 15;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = s.color || state.colors.ENEMY;
      ctx.globalAlpha = s.life;
      ctx.fillRect(s.x, s.y, 3, 3);
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1.0;

  drawFloatingLabels(ctx, state.floatingLabels);

  if (state.player.health === 1 && state.gameState === 'playing') {
    drawDangerVignette(ctx, canvas, state.gameTime);
  }

  ctx.restore();
  ctx.restore();

  drawUI(state);

  if (state.showGrid) {
    drawDebugGrid(ctx, canvas);
  }
}

function drawStars(state: DrawState): void {
  const { ctx, canvas, stars, cameraX } = state;
  ctx.save();
  stars.forEach((star) => {
    const parallaxX = -cameraX * star.speed;
    let starX = (star.x + parallaxX) % (canvas.width * 1.5);
    if (starX < -canvas.width * 0.5) starX += canvas.width * 1.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.beginPath();
    ctx.arc(starX, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDangerVignette(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gameTime: number): void {
  const alpha = 0.3 + Math.sin(gameTime * 0.08) * 0.2;
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.8
  );
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, `rgba(200, 0, 0, ${alpha})`);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawFloatingLabels(ctx: CanvasRenderingContext2D, labels: FloatingLabel[]): void {
  labels.forEach((l) => {
    const alpha = l.life / l.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(l.text, l.x, l.y);
    ctx.restore();
  });
}

export function drawVectorEntity(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  scaleX: number,
  scaleY: number,
  color: string,
  vertices: number,
  useGlow: boolean,
  rotation = 0
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scaleX, scaleY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (useGlow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
  }

  ctx.beginPath();
  if (type === 'player') {
    ctx.rotate(rotation);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * (w / 2);
      const py = Math.sin(angle) * (h / 2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else if (type === 'enemy') {
    ctx.rect(-w / 2, -h / 2, w, h);
  } else if (type === 'level_up') {
    ctx.rect(-w / 2, -h / 2, w, h);
  }
  ctx.closePath();
  ctx.stroke();

  if (type === 'enemy') {
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.3);
    ctx.lineTo(w * 0.3, h * 0.3);
    ctx.moveTo(w * 0.3, -h * 0.3);
    ctx.lineTo(-w * 0.3, h * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlatform(ctx: CanvasRenderingContext2D, p: Platform, gameTime: number): void {
  ctx.save();
  ctx.translate(p.jitterX || 0, p.jitterY || 0);
  ctx.strokeStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 5;

  if (p.type === 'crumble') {
    ctx.strokeStyle = gameTime % 10 < 5 ? '#ffffff' : p.color;
    ctx.lineWidth = 3;
  }

  if (p.type === 'rotating') {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((p.angle || 0) - (p.rotationSpeed || 0.02) * i * 0.8);
      ctx.globalAlpha = 0.4 - i * 0.1;
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    coreGrad.addColorStop(0, '#39FF14');
    coreGrad.addColorStop(0.4, 'rgba(57, 255, 20, 0.4)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    switch (p.type) {
      case 'crumble':
        ctx.lineWidth = 2;
        if (p.isCrumbling) {
          ctx.setLineDash([15, 5]);
          ctx.lineDashOffset = -(gameTime % 20);
        }
        break;
      default:
        ctx.lineWidth = 2;
        break;
    }
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();
}

function drawUI(state: DrawState): void {
  const { ctx, canvas, player, gameState, levelUpChoice, upgradeErrorTimer, colors, combo, milestone, score } = state;

  for (let i = 0; i < player.maxHealth; i++) {
    ctx.strokeStyle = colors.NEON_BLUE;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.NEON_BLUE;
    ctx.shadowBlur = 5;
    if (i < player.health) {
      ctx.fillStyle = colors.NEON_BLUE;
      ctx.fillRect(20 + i * 35, 20, 30, 30);
    } else {
      ctx.strokeRect(20 + i * 35, 20, 30, 30);
    }
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 40);

  if (combo.count >= 2 && combo.timer > 0) {
    const alpha = Math.min(1, combo.timer / 60);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.ENEMY;
    ctx.shadowColor = colors.ENEMY;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`x${combo.multiplier} STREAK`, canvas.width - 20, 70);
    ctx.restore();
  }

  drawUpgradeHistory(ctx, player);

  if (milestone.active) {
    drawMilestoneBanner(ctx, canvas, milestone, state.gameTime);
  }

  if (gameState === 'level_up') {
    drawLevelUpMenu(ctx, canvas, player, levelUpChoice, upgradeErrorTimer, colors);
  } else if (gameState === 'dead') {
    drawDeadOverlay(ctx, canvas, colors);
  }
}

function drawUpgradeHistory(ctx: CanvasRenderingContext2D, player: Player): void {
  const upgrades = [
    { key: 'aero', label: 'A', color: '#00ffff' },
    { key: 'vital', label: 'V', color: '#ff4444' },
    { key: 'pulse', label: 'P', color: '#ffcc00' },
  ];
  let offsetX = 0;
  upgrades.forEach(({ key, label, color }) => {
    const count = player.upgrades[key as keyof typeof player.upgrades];
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(20 + offsetX, 60, 16, 16);
      ctx.restore();
      offsetX += 20;
    }
  });
}

function drawMilestoneBanner(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  milestone: MilestoneState,
  gameTime: number
): void {
  const alpha = Math.min(1, milestone.timer / 30) * Math.min(1, milestone.timer > 90 ? 1 : milestone.timer / 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffcc00';
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MILESTONE: ${milestone.score}`, canvas.width / 2, 80);
  ctx.restore();
}

function drawLevelUpMenu(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: Player,
  levelUpChoice: number,
  upgradeErrorTimer: number,
  colors: typeof COLORS
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.LEVEL_UP;
  ctx.font = '40px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = colors.LEVEL_UP;
  ctx.shadowBlur = 10;
  ctx.fillText('EVOLVE', canvas.width / 2, canvas.height / 2 - 100);

  const choices = [
    `AERO [+JUMP] (${player.upgrades.aero}/${UPGRADE_LIMITS.aero})`,
    `VITAL [+HEALTH] (${player.upgrades.vital}/${UPGRADE_LIMITS.vital})`,
    `PULSE [+RIPPLE] (${player.upgrades.pulse}/${UPGRADE_LIMITS.pulse})`,
  ];
  choices.forEach((text, i) => {
    ctx.font = '24px monospace';
    if (i === levelUpChoice) {
      ctx.fillStyle = colors.PLAYER;
      ctx.shadowColor = colors.PLAYER;
      ctx.shadowBlur = 8;
      ctx.fillText(`> ${text} <`, canvas.width / 2, canvas.height / 2 + i * 50);
    } else {
      const isMaxed =
        (i === 0 && player.upgrades.aero >= UPGRADE_LIMITS.aero) ||
        (i === 1 && player.upgrades.vital >= UPGRADE_LIMITS.vital) ||
        (i === 2 && player.upgrades.pulse >= UPGRADE_LIMITS.pulse);

      if (i === levelUpChoice && isMaxed && upgradeErrorTimer > 0 && Math.floor(upgradeErrorTimer / 5) % 2 === 0) {
        ctx.fillStyle = 'red';
      } else {
        ctx.fillStyle = isMaxed ? '#555' : 'white';
      }
      ctx.shadowBlur = 0;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + i * 50);
    }
  });
}

function drawDeadOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  colors: typeof COLORS
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.ENEMY;
  ctx.font = '50px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = colors.ENEMY;
  ctx.shadowBlur = 10;
  ctx.fillText('ECHO LOST', canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = '20px monospace';
  ctx.fillStyle = 'white';
  ctx.shadowBlur = 0;
  ctx.fillText('Press Enter or tap to continue', canvas.width / 2, canvas.height / 2 + 20);
}

function drawDebugGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.fillStyle = 'white';
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    if (x % 100 === 0 && x > 0) ctx.fillText(x.toString(), x + 4, 12);
  }
  for (let y = 0; y < canvas.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
    if (y % 100 === 0 && y > 0) ctx.fillText(y.toString(), 4, y + 12);
  }
  ctx.restore();
}
