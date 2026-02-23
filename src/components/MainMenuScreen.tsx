import React, { useEffect, useRef } from 'react';
import { COLORS } from '../constants/game';

interface Props {
  playerName: string;
  personalBest: number;
  onPlay: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
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

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.8 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    const player = {
      x: 0,
      y: 0,
      rotation: 0,
      floatOffset: 0,
      pulseT: 0,
      facingRight: true,
    };

    let t = 0;

    function loop() {
      t++;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        const flicker = Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,255,255,${star.opacity * flicker})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const marginX = canvas.width * 0.12;
      const travelWidth = canvas.width - marginX * 2;
      const pacPeriod = 420;
      const rawSin = Math.sin((t / pacPeriod) * Math.PI * 2);
      const cx = marginX + (rawSin * 0.5 + 0.5) * travelWidth;
      const cy = canvas.height * 0.62;
      const floatY = Math.sin(t * 0.018) * 14;
      const r = 18;

      const prevRawSin = Math.sin(((t - 1) / pacPeriod) * Math.PI * 2);
      player.facingRight = rawSin >= prevRawSin;

      player.rotation += 0.008;
      player.pulseT += 0.04;

      ctx.save();
      ctx.translate(cx, cy + floatY);
      ctx.scale(player.facingRight ? 1 : -1, 1);
      ctx.rotate(player.rotation);

      const pulse = Math.sin(player.pulseT) * 0.12 + 1;
      const glowR = r * 4 * pulse;
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      glowGrad.addColorStop(0, 'rgba(0,255,255,0.14)');
      glowGrad.addColorStop(0.5, 'rgba(0,255,255,0.05)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      const shadowBlur = 16 + Math.sin(player.pulseT) * 6;
      ctx.strokeStyle = COLORS.PLAYER;
      ctx.shadowColor = COLORS.PLAYER;
      ctx.shadowBlur = shadowBlur;
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

      const trailCount = 6;
      for (let i = 0; i < trailCount; i++) {
        const age = (i + 1) / trailCount;
        const trailT = t - i * 3;
        const trailRawSin = Math.sin((trailT / pacPeriod) * Math.PI * 2);
        const trailX = marginX + (trailRawSin * 0.5 + 0.5) * travelWidth;
        const trailY = cy + Math.sin(trailT * 0.018) * 14;
        const trailRot = player.rotation - i * 0.024;
        const alpha = (1 - age) * 0.18;

        ctx.save();
        ctx.translate(trailX, trailY);
        ctx.rotate(trailRot);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = COLORS.PLAYER;
        ctx.shadowColor = COLORS.PLAYER;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
          const angle = (j / 3) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

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
