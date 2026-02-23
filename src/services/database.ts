import { supabase } from '../lib/supabase';
import { LeaderboardEntry, RunStats } from '../types/game';
import { levelToTier } from '../constants/levels';

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

export async function upsertLevelProgress(
  playerId: string,
  highestLevel: number,
  rewardsCollected: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('player_level_progress')
    .select('id, highest_level_reached, total_rewards_collected')
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing) {
    const shouldUpdate =
      highestLevel > existing.highest_level_reached ||
      rewardsCollected > 0;
    if (!shouldUpdate) return;
    await supabase.from('player_level_progress').update({
      highest_level_reached: Math.max(existing.highest_level_reached, highestLevel),
      highest_tier_reached: levelToTier(Math.max(existing.highest_level_reached, highestLevel)),
      total_rewards_collected: existing.total_rewards_collected + rewardsCollected,
      updated_at: new Date().toISOString(),
    }).eq('player_id', playerId);
  } else {
    await supabase.from('player_level_progress').insert({
      player_id: playerId,
      highest_level_reached: highestLevel,
      highest_tier_reached: levelToTier(highestLevel),
      total_rewards_collected: rewardsCollected,
    });
  }
}

export async function getPlayerLevelProgress(playerId: string): Promise<{ highestLevel: number; highestTier: number; totalRewards: number } | null> {
  const { data, error } = await supabase
    .from('player_level_progress')
    .select('highest_level_reached, highest_tier_reached, total_rewards_collected')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    highestLevel: data.highest_level_reached,
    highestTier: data.highest_tier_reached,
    totalRewards: data.total_rewards_collected,
  };
}
