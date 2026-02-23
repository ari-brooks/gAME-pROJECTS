import React, { useEffect, useState } from 'react';
import { RunStats } from '../types/game';
import { levelToTier, TIER_DEFINITIONS } from '../constants/levels';

interface Props {
  score: number;
  personalBest: number;
  runStats: RunStats;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onMenu: () => void;
}

export default function DeathScreen({ score, personalBest, runStats, onPlayAgain, onLeaderboard, onMenu }: Props) {
  const isNewBest = score > personalBest;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.85)]"
      style={{ transition: 'opacity 0.3s', opacity: visible ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-5 px-8 py-10 max-w-sm w-full border border-[#ffcc0033] bg-[#0d0d0d]"
        style={{ boxShadow: '0 0 50px rgba(255,204,0,0.06)' }}>

        <div className="font-mono text-4xl text-[#ffcc00] tracking-widest"
          style={{ textShadow: '0 0 20px #ffcc00' }}>
          ECHO LOST
        </div>

        {isNewBest && (
          <div className="font-mono text-sm text-[#00ffff] tracking-widest animate-pulse border border-[#00ffff44] px-4 py-2">
            NEW RECORD
          </div>
        )}

        {runStats.highestLevel > 1 && (() => {
          const tier = TIER_DEFINITIONS[levelToTier(runStats.highestLevel) - 1];
          return (
            <div
              className="w-full text-center font-mono text-sm py-2 border"
              style={{ borderColor: tier.color + '44', color: tier.color, textShadow: `0 0 8px ${tier.color}` }}
            >
              REACHED LVL {runStats.highestLevel} &mdash; {tier.name}
            </div>
          );
        })()}

        <div className="w-full border-t border-[#222] pt-4 flex flex-col gap-2">
          <StatRow label="SCORE" value={score} highlight />
          <StatRow label="BEST" value={isNewBest ? score : personalBest} />
          <div className="border-t border-[#111] my-1" />
          <StatRow label="LEVEL" value={runStats.highestLevel ?? 1} />
          <StatRow label="DISTANCE" value={runStats.distanceTraveled} />
          <StatRow label="ENEMIES" value={runStats.enemiesDefeated} />
          <StatRow label="REWARDS" value={runStats.rewardsCollected ?? 0} />
          <StatRow label="UPGRADES" value={runStats.upgradesAcquired} />
        </div>

        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            onClick={onPlayAgain}
            className="w-full font-mono text-base tracking-widest py-4 border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#0a0a0a] transition-all duration-200 bg-transparent"
          >
            REGENERATE
          </button>
          <button
            onClick={onLeaderboard}
            className="w-full font-mono text-sm tracking-widest py-3 border border-[#333] text-[#555] hover:border-[#ffcc0033] hover:text-[#ffcc0088] transition-all duration-200 bg-transparent"
          >
            LEADERBOARD
          </button>
          <button
            onClick={onMenu}
            className="w-full font-mono text-sm tracking-widest py-3 border border-[#222] text-[#333] hover:border-[#333] hover:text-[#555] transition-all duration-200 bg-transparent"
          >
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center font-mono text-sm">
      <span className="text-[#555] tracking-widest">{label}</span>
      <span
        className={highlight ? 'text-[#00ffff]' : 'text-[#888]'}
        style={highlight ? { textShadow: '0 0 10px rgba(0,255,255,0.5)' } : {}}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
