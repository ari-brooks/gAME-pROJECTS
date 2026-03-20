export const PHYSICS = {
  GRAVITY: 0.7,
  FRICTION: 0.85,
  ACCEL: 0.8,
  MAX_SPEED: 5.5,
  JUMP_FORCE: -15,
  JUMP_HOLD_GRAVITY_MULT: 0.5,
};

export const COLORS = {
  BG: '#0a0a0a',
  PLAYER: '#00ffff',
  ENEMY: '#ffcc00',
  LEVEL_UP: '#cccccc',
  STATIC: '#ffffff',
  MOVING: '#00ffff',
  ROTATING: '#39FF14',
  CRUMBLE: '#ffaa00',
  NEON_BLUE: '#00ffff',
  GHOST: 'rgba(0, 255, 255, 0.15)',
  GATE: '#cccccc',
  ICE: '#88ddff',
  PHASING: '#cc88ff',
  BOUNCY: '#ff44aa',
  SPIRAL: '#ffff00',
  FRAGILE: '#ff6666',
  CRUMBLE_SHATTER: '#ffaa00',
  AERO_PICKUP: '#00ff88',
  VITAL_PICKUP: '#ff4444',
  PULSE_PICKUP: '#ff88ff',
};

export const COLORBLIND_COLORS = {
  BG: '#0a0a0a',
  PLAYER: '#1E90FF',
  ENEMY: '#FF6600',
  LEVEL_UP: '#cccccc',
  STATIC: '#ffffff',
  MOVING: '#1E90FF',
  ROTATING: '#00CC44',
  CRUMBLE: '#FF6600',
  NEON_BLUE: '#1E90FF',
  GHOST: 'rgba(30, 144, 255, 0.15)',
  GATE: '#cccccc',
  ICE: '#88ddff',
  PHASING: '#aaccff',
  BOUNCY: '#ffaa44',
  SPIRAL: '#ffff88',
  FRAGILE: '#ff8888',
  CRUMBLE_SHATTER: '#FF6600',
  AERO_PICKUP: '#00ff88',
  VITAL_PICKUP: '#ff8888',
  PULSE_PICKUP: '#ffaa88',
};

export const UPGRADE_LIMITS = { aero: 5, vital: 3, pulse: 5 };

export const GHOST_DELAY = 30;

export const COMBO_TIMEOUT = 300;
export const COMBO_MAX = 5;

export const MILESTONES = [500, 1000, 2000, 3500, 5000];

export const PLATFORM_TYPES = ['static', 'horizontal', 'vertical', 'crumble', 'rotating', 'phasing', 'ice', 'bounce', 'spiral', 'fragile'] as const;
