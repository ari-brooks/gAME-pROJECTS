/*
  # Echo Run - Players and Scores Schema

  ## Summary
  Sets up the core data persistence layer for the Echo Run platformer game.

  ## New Tables

  ### players
  - `id` (uuid, primary key) - Unique player identifier stored in localStorage
  - `display_name` (text) - Player chosen name shown on leaderboard
  - `created_at` (timestamptz) - First play date

  ### scores
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key -> players.id)
  - `score` (integer) - Final score for the run
  - `run_stats` (jsonb) - Detailed run stats (enemies defeated, fragments collected, etc.)
  - `created_at` (timestamptz)

  ## Views
  ### leaderboard
  - Aggregates the top 10 all-time scores per unique player
  - Joins with players to provide display_name
  - Sorted descending by score

  ## Security
  - RLS enabled on both tables
  - Players: anyone can insert (anonymous players), no reads of other players' rows needed
  - Scores: anyone can insert, anyone can read (for leaderboard)
  - Leaderboard view is readable by all
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register a player"
  ON players FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  run_stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a score"
  ON scores FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read scores for leaderboard"
  ON scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can read player names"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    s.id,
    p.display_name,
    s.score,
    s.run_stats,
    s.created_at
  FROM scores s
  JOIN players p ON s.player_id = p.id
  ORDER BY s.score DESC
  LIMIT 10;
