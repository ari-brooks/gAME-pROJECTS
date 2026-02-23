export interface LevelDefinition {
  level: number;
  scoreThreshold: number;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
}

export interface TierDefinition {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  color: string;
  platformTypes: string[];
  enemySpawnBase: number;
  enemySpeedMult: number;
  minPlatformWidth: number;
  maxPlatformWidth: number;
  minXGap: number;
  maxXGap: number;
  minYGap: number;
  maxYGap: number;
  challengeGapEvery: number;
  challengeGapSize: number;
  midAirEnemyChance: number;
  comboCooldown: number;
}

export type RewardType = 'life' | 'bomb' | 'upgrade_fragment' | 'score_bonus';

export interface LevelReward {
  level: number;
  type: RewardType;
  amount: number;
  label: string;
  color: string;
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: 1,
    name: 'BASICS',
    description: 'Learn to move and jump',
    color: '#00ffff',
    platformTypes: ['static', 'static', 'static', 'crumble'],
    enemySpawnBase: 0.08,
    enemySpeedMult: 1.0,
    minPlatformWidth: 150,
    maxPlatformWidth: 250,
    minXGap: 80,
    maxXGap: 220,
    minYGap: 100,
    maxYGap: 200,
    challengeGapEvery: 8,
    challengeGapSize: 300,
    midAirEnemyChance: 0.05,
    comboCooldown: 360,
  },
  {
    tier: 2,
    name: 'ADAPT',
    description: 'Moving terrain, aerial threats',
    color: '#39FF14',
    platformTypes: ['static', 'static', 'crumble', 'horizontal', 'vertical'],
    enemySpawnBase: 0.22,
    enemySpeedMult: 1.2,
    minPlatformWidth: 110,
    maxPlatformWidth: 220,
    minXGap: 100,
    maxXGap: 270,
    minYGap: 120,
    maxYGap: 240,
    challengeGapEvery: 6,
    challengeGapSize: 340,
    midAirEnemyChance: 0.2,
    comboCooldown: 330,
  },
  {
    tier: 3,
    name: 'MASTERY',
    description: 'All platform types, dense enemies',
    color: '#ffcc00',
    platformTypes: ['static', 'static', 'crumble', 'horizontal', 'vertical', 'rotating', 'phasing'],
    enemySpawnBase: 0.38,
    enemySpeedMult: 1.45,
    minPlatformWidth: 90,
    maxPlatformWidth: 190,
    minXGap: 120,
    maxXGap: 300,
    minYGap: 130,
    maxYGap: 260,
    challengeGapEvery: 4,
    challengeGapSize: 380,
    midAirEnemyChance: 0.35,
    comboCooldown: 300,
  },
  {
    tier: 4,
    name: 'SURVIVAL',
    description: 'Relentless pace, precision required',
    color: '#ff6600',
    platformTypes: ['static', 'crumble', 'horizontal', 'vertical', 'rotating', 'phasing'],
    enemySpawnBase: 0.54,
    enemySpeedMult: 1.75,
    minPlatformWidth: 70,
    maxPlatformWidth: 160,
    minXGap: 140,
    maxXGap: 330,
    minYGap: 140,
    maxYGap: 280,
    challengeGapEvery: 3,
    challengeGapSize: 420,
    midAirEnemyChance: 0.5,
    comboCooldown: 280,
  },
  {
    tier: 5,
    name: 'ENDGAME',
    description: 'Maximum chaos - prove yourself',
    color: '#ff2244',
    platformTypes: ['static', 'crumble', 'horizontal', 'vertical', 'rotating', 'phasing', 'phasing'],
    enemySpawnBase: 0.72,
    enemySpeedMult: 2.1,
    minPlatformWidth: 55,
    maxPlatformWidth: 140,
    minXGap: 160,
    maxXGap: 360,
    minYGap: 150,
    maxYGap: 300,
    challengeGapEvery: 3,
    challengeGapSize: 460,
    midAirEnemyChance: 0.65,
    comboCooldown: 260,
  },
];

function buildScoreThresholds(): number[] {
  const thresholds: number[] = [0];
  for (let lvl = 2; lvl <= 100; lvl++) {
    const t = Math.round(60 * Math.pow(lvl - 1, 1.65));
    thresholds.push(t);
  }
  return thresholds;
}

export const LEVEL_SCORE_THRESHOLDS = buildScoreThresholds();

export function scoreToLevel(score: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_SCORE_THRESHOLDS.length; i++) {
    if (score >= LEVEL_SCORE_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 100);
}

export function levelToTier(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 20) return 1;
  if (level <= 40) return 2;
  if (level <= 60) return 3;
  if (level <= 80) return 4;
  return 5;
}

export function getTierDefinition(level: number): TierDefinition {
  return TIER_DEFINITIONS[levelToTier(level) - 1];
}

export function levelProgressPercent(score: number, level: number): number {
  if (level >= 100) return 1;
  const current = LEVEL_SCORE_THRESHOLDS[level - 1];
  const next = LEVEL_SCORE_THRESHOLDS[level];
  return Math.min(1, (score - current) / (next - current));
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5,  type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 8,  type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 10, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 13, type: 'score_bonus',      amount: 500, label: '+500 PTS', color: '#ffcc00' },
  { level: 15, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 18, type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 20, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 22, type: 'score_bonus',      amount: 800, label: '+800 PTS', color: '#ffcc00' },
  { level: 25, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 28, type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 30, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 33, type: 'score_bonus',      amount: 1200, label: '+1200 PTS', color: '#ffcc00' },
  { level: 35, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 38, type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 40, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 43, type: 'score_bonus',      amount: 1800, label: '+1800 PTS', color: '#ffcc00' },
  { level: 45, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 48, type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 50, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 53, type: 'score_bonus',      amount: 2500, label: '+2500 PTS', color: '#ffcc00' },
  { level: 55, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 58, type: 'bomb',             amount: 2, label: '+2 BOMBS', color: '#ff6600' },
  { level: 60, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 63, type: 'score_bonus',      amount: 3500, label: '+3500 PTS', color: '#ffcc00' },
  { level: 65, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 68, type: 'bomb',             amount: 3, label: '+3 BOMBS', color: '#ff6600' },
  { level: 70, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 73, type: 'score_bonus',      amount: 5000, label: '+5000 PTS', color: '#ffcc00' },
  { level: 75, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 78, type: 'bomb',             amount: 3, label: '+3 BOMBS', color: '#ff6600' },
  { level: 80, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 83, type: 'score_bonus',      amount: 7000, label: '+7000 PTS', color: '#ffcc00' },
  { level: 85, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 88, type: 'bomb',             amount: 3, label: '+3 BOMBS', color: '#ff6600' },
  { level: 90, type: 'upgrade_fragment', amount: 1, label: 'EVOLVE',   color: '#cccccc' },
  { level: 93, type: 'score_bonus',      amount: 10000, label: '+10000 PTS', color: '#ffcc00' },
  { level: 95, type: 'life',             amount: 1, label: '+LIFE',    color: '#ff4444' },
  { level: 98, type: 'bomb',             amount: 3, label: '+3 BOMBS', color: '#ff6600' },
  { level: 100, type: 'upgrade_fragment', amount: 1, label: 'ECHO COMPLETE', color: '#ffffff' },
];

export const TIER_TRANSITION_LEVELS = new Set([20, 40, 60, 80, 100]);
