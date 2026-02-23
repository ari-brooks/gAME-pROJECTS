/*
  # Add Level Progression Tables

  ## Summary
  Adds tables to persist level progression data for Echo Run's 1-100 level system.

  ## New Tables

  ### `player_level_progress`
  Tracks the highest level each player has ever reached across all runs.
  - `player_id` - References the player
  - `highest_level_reached` - The highest level number (1-100) achieved
  - `highest_tier_reached` - The tier (1-5) corresponding to the highest level
  - `total_rewards_collected` - Cumulative count of all rewards collected across runs
  - `updated_at` - When this record was last updated

  ### `level_rewards_log`
  Logs each reward granted to a player at a specific level, preventing duplicate grants.
  - `player_id` - References the player
  - `level` - The level at which the reward was granted
  - `reward_type` - Type of reward: 'life', 'bomb', 'upgrade_fragment', 'score_bonus'
  - `amount` - How much of the reward was granted
  - `awarded_at` - When the reward was granted

  ## Modified Tables

  ### `scores`
  The `run_stats` JSONB column now optionally stores:
  - `highestLevel` - Level reached in this run
  - `rewardsCollected` - Number of rewards collected in this run
  (These fields are additive and backward-compatible with existing rows)

  ## Security
  - RLS enabled on both new tables
  - Players can only read and write their own progression data
*/

CREATE TABLE IF NOT EXISTS player_level_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  highest_level_reached integer NOT NULL DEFAULT 1,
  highest_tier_reached integer NOT NULL DEFAULT 1,
  total_rewards_collected integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_level_progress_player_id_idx
  ON player_level_progress(player_id);

ALTER TABLE player_level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own level progress"
  ON player_level_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "Players can insert own level progress"
  ON player_level_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update own level progress"
  ON player_level_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

CREATE TABLE IF NOT EXISTS level_rewards_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  level integer NOT NULL,
  reward_type text NOT NULL,
  amount integer NOT NULL DEFAULT 1,
  awarded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS level_rewards_log_player_id_idx
  ON level_rewards_log(player_id);

ALTER TABLE level_rewards_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own reward log"
  ON level_rewards_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "Players can insert own reward log"
  ON level_rewards_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);
