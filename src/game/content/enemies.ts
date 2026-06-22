import type { EnemyConfig, EnemyKind } from '../simulation/types';

export const ENEMY_CONFIGS: Record<EnemyKind, EnemyConfig> = {
  normal: {
    id: 'normal',
    hp: 34,
    speed: 1.25,
    reward: 9,
    baseDamage: 8
  },
  fast: {
    id: 'fast',
    hp: 22,
    speed: 1.9,
    reward: 8,
    baseDamage: 6
  },
  tough: {
    id: 'tough',
    hp: 78,
    speed: 0.82,
    reward: 16,
    baseDamage: 14
  }
};

