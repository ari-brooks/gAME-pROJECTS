import React, { useEffect, useRef } from 'react';
import { COLORS } from '../constants/game';

interface Props {
  playerName: string;
  personalBest: number;
  onPlay: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
}

const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const MOVE_SPEED = 2.2;

interface SimPlatform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SimEnemy {
  x: number;
  y: number;
  vx: number;
  startX: number;
  endX: number;
  w: number;
  h: number;
}

export default function MainMenuScreen({ playerName, personalBest, onPlay, onLeaderboard, onSettings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth * 2,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.15 + 0.05,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    function buildPlatforms(cw: number, ch: number): SimPlatform[] {
      const baseY = ch * 0.78;
      const platforms: SimPlatform[] = [
        { x: cw * 0.05, y: baseY,           w: 180, h: 10 },
        { x: cw * 0.28, y: baseY - 70,      w: 160, h: 10 },
        { x: cw * 0.50, y: baseY - 30,      w: 200, h: 10 },
        { x: cw * 0.73, y: baseY - 90,      w: 160, h: 10 },
        { x: cw * 0.88, y: baseY - 10,      w: 140, h: 10 },
      ];
      return platforms;
    }

    function buildEnemies(platforms: SimPlatform[]): SimEnemy[] {
      return [
        {
          x: platforms[1].x + 40,
          y: platforms[1].y - 20,
          vx: 0.8,
          startX: platforms[1].x,
          endX: platforms[1].x + platforms[1].w,
          w: 16,
          h: 16,
        },
        {
          x: platforms[3].x + 30,
          y: platforms[3].y - 20,
          vx: -1.0,
          startX: platforms[3].x,
          endX: platforms[3].x + platforms[3].w,
          w: 16,
          h: 16,
        },
      ];
    }

    let platforms = buildPlatforms(canvas.width, canvas.height);
    let enemies = buildEnemies(platforms);

    const player = {
      x: platforms[0].x + platforms[0].w / 2 - 12,
      y: platforms[0].y - 24,
      vx: MOVE_SPEED,
      vy: 0,
      w: 24,
      h: 24,
      grounded: true,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      targetPlatformIdx: 1,
      justJumped: false,
      jumpCooldown: 0,
    };

    let t = 0;
    let shards: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

    function spawnShatter(x: number, y: number, color: string) {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        shards.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 30, color });
      }
    }

    function updatePlayer() {
      if (player.jumpCooldown > 0) player.jumpCooldown--;

      const target = platforms[player.targetPlatformIdx];
      const targetCenterX = target.x + target.w / 2;
      const playerCenterX = player.x + player.w / 2;

      player.vx = MOVE_SPEED * (targetCenterX > playerCenterX ? 1 : -1);

      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      player.grounded = false;
      for (const p of platforms) {
        const nextBottom = player.y + player.h;
        const prevBottom = nextBottom - player.vy;
        const withinX = player.x < p.x + p.w && player.x + player.w > p.x;
        const crossingTop = prevBottom <= p.y + 5 && nextBottom >= p.y;
        if (withinX && crossingTop && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.grounded = true;
          spawnShatter(player.x + player.w / 2, p.y, '#00ffff');
          break;
        }
      }

      if (player.grounded) {
        const currentPlatform = platforms.find(p => {
          const withinX = player.x < p.x + p.w && player.x + player.w > p.x;
          const onTop = Math.abs((player.y + player.h) - p.y) < 5;
          return withinX && onTop;
        });

        if (currentPlatform) {
          const idx = platforms.indexOf(currentPlatform);
          const isTarget = idx === player.targetPlatformIdx;

          const distToEdge = player.vx > 0
            ? (currentPlatform.x + currentPlatform.w) - (player.x + player.w)
            : player.x - currentPlatform.x;

          const shouldJump = isTarget || distToEdge < 30;

          if (shouldJump && player.jumpCooldown === 0) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumpCooldown = 20;
            player.scaleX = 0.6;
            player.scaleY = 1.4;
            if (isTarget) {
              player.targetPlatformIdx = (player.targetPlatformIdx + 1) % platforms.length;
            }
          }
        }

        player.scaleX += (1 - player.scaleX) * 0.15;
        player.scaleY += (1 - player.scaleY) * 0.15;
      } else {
        player.rotation += 0.04;
        player.scaleX += (1 - player.scaleX) * 0.1;
        player.scaleY += (1 - player.scaleY) * 0.1;
      }

      if (player.y > canvas.height + 100) {
        player.x = platforms[0].x + platforms[0].w / 2 - player.w / 2;
        player.y = platforms[0].y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.targetPlatformIdx = 1;
        player.jumpCooldown = 30;
      }
    }

    function updateEnemies() {
      for (const e of enemies) {
        e.x += e.vx;
        if (e.x < e.startX || e.x + e.w > e.endX) e.vx *= -1;
      }
    }

    function drawPlatform(p: SimPlatform) {
      ctx.save();
      ctx.strokeStyle = COLORS.STATIC;
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y);
      ctx.stroke();

      const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h + 4);
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h + 4);
      ctx.restore();
    }

    function drawEnemy(e: SimEnemy) {
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.rotate(t * 0.04);
      ctx.strokeStyle = COLORS.ENEMY;
      ctx.shadowColor = COLORS.ENEMY;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-e.w / 2, -e.h / 2, e.w, e.h);
      ctx.stroke();
      ctx.restore();
    }

    function drawPlayer() {
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const r = 12;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(player.scaleX, player.scaleY);
      ctx.rotate(player.rotation);

      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
      glowGrad.addColorStop(0, 'rgba(0,255,255,0.18)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.strokeStyle = COLORS.PLAYER;
      ctx.shadowColor = COLORS.PLAYER;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function drawShards() {
      for (const s of shards) {
        ctx.save();
        ctx.globalAlpha = s.life / 30;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function loop() {
      t++;
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        platforms = buildPlatforms(canvas.width, canvas.height);
        enemies = buildEnemies(platforms);
      }

      updatePlayer();
      updateEnemies();

      for (let i = shards.length - 1; i >= 0; i--) {
        shards[i].x += shards[i].vx;
        shards[i].y += shards[i].vy;
        shards[i].vy += 0.15;
        shards[i].life--;
        if (shards[i].life <= 0) shards.splice(i, 1);
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        const px = (star.x - t * star.speed * 0.5) % (canvas.width * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.beginPath();
        ctx.arc(px < 0 ? px + canvas.width * 2 : px, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const dividerY = canvas.height * 0.52;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.moveTo(0, dividerY);
      ctx.lineTo(canvas.width, dividerY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      for (const p of platforms) drawPlatform(p);
      for (const e of enemies) drawEnemy(e);
      drawShards();
      drawPlayer();

      animRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 flex flex-col items-center justify-start pt-[6vh] gap-2 px-6" style={{ height: '50%' }}>
        <div
          className="font-mono text-5xl md:text-7xl tracking-widest text-[#00ffff] mb-2 select-none"
          style={{ textShadow: '0 0 30px #00ffff, 0 0 60px rgba(0,255,255,0.3)' }}
        >
          ECHO RUN
        </div>
        <div className="font-mono text-xs text-[#444] tracking-[0.3em] mb-4">
          SIGNAL INTACT
        </div>

        {personalBest > 0 && (
          <div className="font-mono text-sm text-[#555] tracking-widest mb-1">
            BEST: <span className="text-[#00ffff88]">{personalBest}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs mt-3">
          <MenuButton onClick={onPlay} primary>PLAY</MenuButton>
          <MenuButton onClick={onLeaderboard}>LEADERBOARD</MenuButton>
          <MenuButton onClick={onSettings}>SETTINGS</MenuButton>
        </div>

        {playerName && (
          <div className="font-mono text-xs text-[#333] tracking-widest mt-3">
            {playerName}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({ children, onClick, primary = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full font-mono text-base tracking-widest py-4 border transition-all duration-200 ${
        primary
          ? 'border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#0a0a0a]'
          : 'border-[#333] text-[#555] hover:border-[#00ffff44] hover:text-[#00ffff88]'
      }`}
      style={{ background: 'transparent' }}
    >
      {children}
    </button>
  );
}
