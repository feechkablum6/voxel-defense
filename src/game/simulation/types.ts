export type TowerKind = 'arrow' | 'cannon' | 'frost';
export type EnemyKind = 'normal' | 'fast' | 'tough';
export type ProjectileKind = 'arrow' | 'cannon' | 'frost';
export type GamePhase = 'menu' | 'playing' | 'gameover';
export type WaveState = 'idle' | 'active' | 'between';

export interface Cell {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TowerConfig {
  id: TowerKind;
  label: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  splash?: number;
  slowFactor?: number;
  slowDuration?: number;
  projectile: ProjectileKind;
}

export interface EnemyConfig {
  id: EnemyKind;
  hp: number;
  speed: number;
  reward: number;
  baseDamage: number;
}

export interface Tower {
  id: number;
  kind: TowerKind;
  cell: Cell;
  cooldownLeft: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  progress: number;
  slowLeft: number;
  slowFactor: number;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  from: Point;
  to: Point;
  age: number;
  duration: number;
}

export interface SpawnItem {
  kind: EnemyKind;
  delay: number;
}

export interface HoverCell {
  cell: Cell;
  valid: boolean;
}

export interface GameState {
  phase: GamePhase;
  waveState: WaveState;
  wave: number;
  baseHp: number;
  coins: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  spawnQueue: SpawnItem[];
  spawnTimer: number;
  nextWaveIn: number;
  hover: HoverCell | null;
  nextIds: {
    tower: number;
    enemy: number;
    projectile: number;
  };
}

export interface PlaceResult {
  ok: boolean;
  reason?: 'phase' | 'bounds' | 'road' | 'occupied' | 'coins';
}

