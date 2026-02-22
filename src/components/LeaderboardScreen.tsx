import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types/game';
import { getLeaderboard, getPersonalBest } from '../services/database';

interface Props {
  playerId: string;
  playerName: string;
  onBack: () => void;
}

export default function LeaderboardScreen({ playerId, playerName, onBack }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [lb, pb] = await Promise.all([
          getLeaderboard(),
          playerId ? getPersonalBest(playerId) : Promise.resolve(0),
        ]);
        setEntries(lb);
        setPersonalBest(pb);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [playerId]);

  const playerInTop = entries.some(e => e.display_name === playerName);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col w-full max-w-md px-6 py-8 gap-6">
        <div className="flex items-center justify-between">
          <div className="font-mono text-2xl text-[#00ffff] tracking-widest"
            style={{ textShadow: '0 0 20px #00ffff' }}>
            LEADERBOARD
          </div>
          <button
            onClick={onBack}
            className="font-mono text-xs text-[#444] hover:text-[#00ffff] tracking-widest transition-colors duration-150 bg-transparent border-none"
          >
            &lt; BACK
          </button>
        </div>

        <div className="flex flex-col gap-0 border border-[#1a1a1a]">
          <div className="flex justify-between px-4 py-2 border-b border-[#1a1a1a] font-mono text-xs text-[#333] tracking-widest">
            <span>RANK</span>
            <span>CALLSIGN</span>
            <span>SCORE</span>
          </div>

          {loading && (
            <div className="py-12 text-center font-mono text-sm text-[#333] tracking-widest">
              SCANNING...
            </div>
          )}

          {error && (
            <div className="py-12 text-center font-mono text-sm text-[#ff444488] tracking-widest">
              SIGNAL LOST
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="py-12 text-center font-mono text-sm text-[#333] tracking-widest">
              NO RECORDS YET
            </div>
          )}

          {!loading && !error && entries.map((entry, i) => {
            const isMe = entry.display_name === playerName;
            return (
              <div
                key={entry.id}
                className={`flex justify-between items-center px-4 py-3 border-b border-[#111] font-mono text-sm ${
                  isMe ? 'bg-[#00ffff08] text-[#00ffff]' : 'text-[#666]'
                }`}
              >
                <span className="w-8 text-[#333]">#{i + 1}</span>
                <span className="flex-1 text-center tracking-wider truncate max-w-[140px]">{entry.display_name}</span>
                <span className={isMe ? 'text-[#00ffff]' : 'text-[#888]'}>{entry.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {!loading && !error && !playerInTop && personalBest > 0 && (
          <div className="border border-[#00ffff22] px-4 py-3 font-mono text-sm flex justify-between items-center">
            <span className="text-[#333] tracking-widest">YOUR BEST</span>
            <span className="text-[#00ffff88]">{playerName}</span>
            <span className="text-[#00ffff88]">{personalBest.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
