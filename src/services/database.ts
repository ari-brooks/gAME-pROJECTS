import { supabase } from '../lib/supabase';
import { LeaderboardEntry, RunStats } from '../types/game';

export async function savePlayerName(displayName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('players')
    .insert({ display_name: displayName })
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('savePlayerName error:', error);
    return null;
  }
  return data?.id ?? null;
}

export async function saveScore(
  playerId: string,
  score: number,
  runStats: RunStats
): Promise<void> {
  const { error } = await supabase.from('scores').insert({
    player_id: playerId,
    score,
    run_stats: runStats,
  });
  if (error) console.error('saveScore error:', error);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(10);
  if (error) {
    console.error('getLeaderboard error:', error);
    return [];
  }
  return data ?? [];
}

export async function getPersonalBest(playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('scores')
    .select('score')
    .eq('player_id', playerId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 0;
  return data?.score ?? 0;
}
