export type GameState = 'menu' | 'playing' | 'level_up' | 'dead' | 'leaderboard' | 'settings' | 'name_entry';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  scaleX: number;
  scaleY: number;
  health: number;
  maxHealth: number;
  invincibleTimer: number;
  grounded: boolean;
  upgrades: { aero: number; vital: number; pulse: number };
  vertices: number;
  rotation: number;
  onPlatformType: string | null;
  onPlatform: Platform | null;
  relativeAngle: number;
  relativeDist: number;
  hasLanded: boolean;
  color: string;
  platformLastX: number;
  platformLastY: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'static' | 'horizontal' | 'vertical' | 'crumble' | 'rotating' | 'phasing';
  color: string;
  isPhasedOut?: boolean;
  isCollidable?: boolean;
  isNeutral?: boolean;
  angle?: number;
  rotationSpeed?: number;
  startX?: number;
  endX?: number;
  startY?: number;
  endY?: number;
  speed?: number;
  isCrumbling?: boolean;
  collapseTimer?: number;
  originalColor?: string;
  jitterX?: number;
  jitterY?: number;
  vy?: number;
  opacity?: number;
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  startX: number;
  endX: number;
  type: 'on-platform' | 'mid-air';
  baseY?: number;
  hoverOffset?: number;
}

export interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'shatter' | 'shockwave' | 'other';
  color: string;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
}

export interface LevelUpFragment {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export interface PositionSnapshot {
  x: number;
  y: number;
  rotation: number;
}

export interface ComboState {
  count: number;
  timer: number;
  multiplier: number;
}

export interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface MilestoneState {
  active: boolean;
  timer: number;
  score: number;
}

export interface RunStats {
  score: number;
  enemiesDefeated: number;
  fragmentsCollected: number;
  upgradesAcquired: number;
  distanceTraveled: number;
}

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  score: number;
  run_stats: RunStats | null;
  created_at: string;
}
