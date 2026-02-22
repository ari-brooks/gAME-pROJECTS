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

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth * 2,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.15 + 0.05,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    let t = 0;
    let playerX = -60;
    const playerY = () => canvas.height * 0.5 + Math.sin(t * 0.03) * 18;

    function loop() {
      t++;
      playerX += 0.4;
      if (playerX > canvas.width + 80) playerX = -60;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        const px = (star.x - t * star.speed * 0.5) % (canvas.width * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.beginPath();
        ctx.arc(px < 0 ? px + canvas.width * 2 : px, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const glowRadius = 300 + Math.sin(t * 0.04) * 40;
      const grad = ctx.createRadialGradient(playerX, playerY(), 0, playerX, playerY(), glowRadius);
      grad.addColorStop(0, 'rgba(0,255,255,0.06)');
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(playerX, playerY(), glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(playerX, playerY());
      ctx.rotate(t * 0.03);
      ctx.strokeStyle = COLORS.PLAYER;
      ctx.shadowColor = COLORS.PLAYER;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * 12;
        const py = Math.sin(angle) * 12;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

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

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
        <div
          className="font-mono text-5xl md:text-7xl tracking-widest text-[#00ffff] mb-2 select-none"
          style={{ textShadow: '0 0 30px #00ffff, 0 0 60px rgba(0,255,255,0.3)' }}
        >
          ECHO RUN
        </div>
        <div className="font-mono text-xs text-[#444] tracking-[0.3em] mb-8">
          SIGNAL INTACT
        </div>

        {personalBest > 0 && (
          <div className="font-mono text-sm text-[#555] tracking-widest mb-2">
            BEST: <span className="text-[#00ffff88]">{personalBest}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <MenuButton onClick={onPlay} primary>PLAY</MenuButton>
          <MenuButton onClick={onLeaderboard}>LEADERBOARD</MenuButton>
          <MenuButton onClick={onSettings}>SETTINGS</MenuButton>
        </div>

        {playerName && (
          <div className="absolute bottom-8 font-mono text-xs text-[#333] tracking-widest">
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
