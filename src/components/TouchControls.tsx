import React from 'react';

interface Props {
  onJump: () => void;
  onPulse: () => void;
  gameState: string;
}

function fireKey(code: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

export default function TouchControls({ onJump, onPulse, gameState }: Props) {
  if (gameState !== 'playing' && gameState !== 'level_up') return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ touchAction: 'none' }}>
      <button
        onTouchStart={() => fireKey('ArrowLeft', 'keydown')}
        onTouchEnd={() => fireKey('ArrowLeft', 'keyup')}
        onTouchCancel={() => fireKey('ArrowLeft', 'keyup')}
        className="pointer-events-auto absolute left-4 bottom-8 w-20 h-20 rounded-full border border-[#00ffff33] text-[#00ffff66] font-mono text-2xl flex items-center justify-center bg-[rgba(0,255,255,0.04)] active:bg-[rgba(0,255,255,0.12)] transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
      >
        ←
      </button>

      <button
        onTouchStart={() => fireKey('ArrowRight', 'keydown')}
        onTouchEnd={() => fireKey('ArrowRight', 'keyup')}
        onTouchCancel={() => fireKey('ArrowRight', 'keyup')}
        className="pointer-events-auto absolute left-28 bottom-8 w-20 h-20 rounded-full border border-[#00ffff33] text-[#00ffff66] font-mono text-2xl flex items-center justify-center bg-[rgba(0,255,255,0.04)] active:bg-[rgba(0,255,255,0.12)] transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
      >
        →
      </button>

      <button
        onTouchStart={onJump}
        className="pointer-events-auto absolute right-4 bottom-8 w-24 h-24 rounded-full border-2 border-[#00ffff44] text-[#00ffff88] font-mono text-xs tracking-widest flex items-center justify-center bg-[rgba(0,255,255,0.04)] active:bg-[rgba(0,255,255,0.15)] transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
      >
        JUMP
      </button>

      <button
        onTouchStart={onPulse}
        className="pointer-events-auto absolute right-32 bottom-8 w-20 h-20 rounded-full border border-[#ffcc0033] text-[#ffcc0066] font-mono text-xs tracking-widest flex items-center justify-center bg-[rgba(255,204,0,0.03)] active:bg-[rgba(255,204,0,0.1)] transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
      >
        PULSE
      </button>
    </div>
  );
}
