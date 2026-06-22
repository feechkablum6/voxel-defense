import type { TowerConfig, TowerKind } from '../simulation/types';

export const TOWER_CONFIGS: Record<TowerKind, TowerConfig> = {
  arrow: {
    id: 'arrow',
    label: 'Arrow',
    cost: 40,
    damage: 13,
    range: 3.4,
    cooldown: 0.45,
    projectile: 'arrow'
  },
  cannon: {
    id: 'cannon',
    label: 'Cannon',
    cost: 75,
    damage: 26,
    range: 3,
    cooldown: 1.15,
    splash: 1.15,
    projectile: 'cannon'
  },
  frost: {
    id: 'frost',
    label: 'Frost',
    cost: 60,
    damage: 5,
    range: 3.2,
    cooldown: 0.75,
    slowFactor: 0.5,
    slowDuration: 1.4,
    projectile: 'frost'
  }
};

export const TOWER_ORDER: TowerKind[] = ['arrow', 'cannon', 'frost'];

