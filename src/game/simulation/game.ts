import { ENEMY_CONFIGS } from '../content/enemies';
import { isInsideMap, isRoadCell, ROAD_PATH } from '../content/map';
import { TOWER_CONFIGS } from '../content/towers';
import type { Cell, Enemy, EnemyKind, GameState, PlaceResult, Point, TowerKind } from './types';

const START_COINS = 150;
const BASE_HP = 100;
const BETWEEN_WAVES_SECONDS = 8;
const PROJECTILE_LIFETIME = 0.18;

export function createGame(): GameState {
  return {
    phase: 'menu',
    waveState: 'idle',
    wave: 0,
    baseHp: BASE_HP,
    coins: START_COINS,
    towers: [],
    enemies: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextWaveIn: 0,
    hover: null,
    nextIds: { tower: 1, enemy: 1, projectile: 1 }
  };
}

export function playGame(game: GameState): void {
  if (game.phase === 'menu') {
    game.phase = 'playing';
    game.waveState = 'between';
    game.nextWaveIn = BETWEEN_WAVES_SECONDS;
  }
}

export function resetGame(game: GameState): void {
  Object.assign(game, createGame());
  playGame(game);
}

export function startWave(game: GameState): void {
  if (game.phase !== 'playing' || game.waveState === 'active') return;
  game.wave += 1;
  game.waveState = 'active';
  game.nextWaveIn = 0;
  game.spawnTimer = 0;
  game.spawnQueue = buildWave(game.wave);
}

export function placeTower(game: GameState, kind: TowerKind, cell: Cell): PlaceResult {
  const config = TOWER_CONFIGS[kind];
  if (game.phase === 'gameover') return { ok: false, reason: 'phase' };
  if (!isInsideMap(cell)) return { ok: false, reason: 'bounds' };
  if (isRoadCell(cell)) return { ok: false, reason: 'road' };
  if (game.towers.some((tower) => sameCell(tower.cell, cell))) return { ok: false, reason: 'occupied' };
  if (game.coins < config.cost) return { ok: false, reason: 'coins' };

  game.coins -= config.cost;
  game.towers.push({
    id: game.nextIds.tower,
    kind,
    cell: { ...cell },
    cooldownLeft: 0
  });
  game.nextIds.tower += 1;
  return { ok: true };
}

export function canPlaceTower(game: GameState, kind: TowerKind, cell: Cell): boolean {
  return placePreview(game, kind, cell).ok;
}

export function placePreview(game: GameState, kind: TowerKind, cell: Cell): PlaceResult {
  const config = TOWER_CONFIGS[kind];
  if (!isInsideMap(cell)) return { ok: false, reason: 'bounds' };
  if (isRoadCell(cell)) return { ok: false, reason: 'road' };
  if (game.towers.some((tower) => sameCell(tower.cell, cell))) return { ok: false, reason: 'occupied' };
  if (game.coins < config.cost) return { ok: false, reason: 'coins' };
  return { ok: true };
}

export function updateGame(game: GameState, dt: number): void {
  if (game.phase !== 'playing') return;
  updateBetweenWaves(game, dt);
  updateSpawns(game, dt);
  updateTowers(game, dt);
  updateEnemies(game, dt);
  updateProjectiles(game, dt);
  finishWaveIfNeeded(game);
}

export function enemyPosition(enemy: Enemy): Point {
  const index = Math.min(Math.floor(enemy.progress), ROAD_PATH.length - 1);
  const nextIndex = Math.min(index + 1, ROAD_PATH.length - 1);
  const from = ROAD_PATH[index];
  const to = ROAD_PATH[nextIndex];
  const amount = enemy.progress - index;
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount
  };
}

function buildWave(wave: number): { kind: EnemyKind; delay: number }[] {
  const count = 8 + wave * 2;
  const queue: { kind: EnemyKind; delay: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const kind = pickEnemyKind(wave, i);
    queue.push({ kind, delay: 0.55 });
  }
  return queue;
}

function pickEnemyKind(wave: number, index: number): EnemyKind {
  if (wave >= 5 && index % 6 === 5) return 'tough';
  if (wave >= 3 && index % 4 === 2) return 'fast';
  return 'normal';
}

function updateBetweenWaves(game: GameState, dt: number): void {
  if (game.waveState !== 'between') return;
  game.nextWaveIn = Math.max(0, game.nextWaveIn - dt);
  if (game.nextWaveIn === 0) startWave(game);
}

function updateSpawns(game: GameState, dt: number): void {
  if (game.waveState !== 'active' || game.spawnQueue.length === 0) return;
  game.spawnTimer -= dt;
  while (game.spawnTimer <= 0 && game.spawnQueue.length > 0) {
    const item = game.spawnQueue.shift();
    if (!item) return;
    spawnEnemy(game, item.kind);
    game.spawnTimer += item.delay;
  }
}

function spawnEnemy(game: GameState, kind: EnemyKind): void {
  const config = ENEMY_CONFIGS[kind];
  const hpScale = 1 + Math.max(0, game.wave - 1) * 0.14;
  game.enemies.push({
    id: game.nextIds.enemy,
    kind,
    hp: Math.round(config.hp * hpScale),
    maxHp: Math.round(config.hp * hpScale),
    progress: 0,
    slowLeft: 0,
    slowFactor: 1
  });
  game.nextIds.enemy += 1;
}

function updateTowers(game: GameState, dt: number): void {
  for (const tower of game.towers) {
    tower.cooldownLeft = Math.max(0, tower.cooldownLeft - dt);
    if (tower.cooldownLeft > 0) continue;

    const config = TOWER_CONFIGS[tower.kind];
    const target = findTarget(game, tower.cell, config.range);
    if (!target) continue;

    const from = cellCenter(tower.cell);
    const to = enemyPosition(target);
    damageTarget(game, target, config.damage);
    if (config.splash) damageSplash(game, target, config.damage * 0.55, config.splash);
    if (config.slowFactor && config.slowDuration) {
      target.slowFactor = config.slowFactor;
      target.slowLeft = config.slowDuration;
    }
    game.projectiles.push({
      id: game.nextIds.projectile,
      kind: config.projectile,
      from,
      to,
      age: 0,
      duration: PROJECTILE_LIFETIME
    });
    game.nextIds.projectile += 1;
    tower.cooldownLeft = config.cooldown;
  }
}

function findTarget(game: GameState, cell: Cell, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bestProgress = -1;
  const from = cellCenter(cell);
  for (const enemy of game.enemies) {
    if (distance(from, enemyPosition(enemy)) > range) continue;
    if (enemy.progress > bestProgress) {
      best = enemy;
      bestProgress = enemy.progress;
    }
  }
  return best;
}

function damageTarget(game: GameState, enemy: Enemy, damage: number): void {
  enemy.hp -= damage;
  if (enemy.hp <= 0) killEnemy(game, enemy);
}

function damageSplash(game: GameState, center: Enemy, damage: number, radius: number): void {
  const centerPos = enemyPosition(center);
  for (const enemy of [...game.enemies]) {
    if (enemy.id === center.id) continue;
    if (distance(centerPos, enemyPosition(enemy)) <= radius) damageTarget(game, enemy, damage);
  }
}

function killEnemy(game: GameState, enemy: Enemy): void {
  const config = ENEMY_CONFIGS[enemy.kind];
  game.enemies = game.enemies.filter((item) => item.id !== enemy.id);
  game.coins += config.reward;
}

function updateEnemies(game: GameState, dt: number): void {
  for (const enemy of [...game.enemies]) {
    const config = ENEMY_CONFIGS[enemy.kind];
    enemy.slowLeft = Math.max(0, enemy.slowLeft - dt);
    if (enemy.slowLeft === 0) enemy.slowFactor = 1;
    enemy.progress += config.speed * enemy.slowFactor * dt;
    if (enemy.progress >= ROAD_PATH.length - 1) leakEnemy(game, enemy);
  }
}

function leakEnemy(game: GameState, enemy: Enemy): void {
  const config = ENEMY_CONFIGS[enemy.kind];
  game.enemies = game.enemies.filter((item) => item.id !== enemy.id);
  game.baseHp = Math.max(0, game.baseHp - config.baseDamage);
  if (game.baseHp === 0) {
    game.phase = 'gameover';
    game.waveState = 'idle';
    game.spawnQueue = [];
  }
}

function updateProjectiles(game: GameState, dt: number): void {
  for (const projectile of game.projectiles) projectile.age += dt;
  game.projectiles = game.projectiles.filter((projectile) => projectile.age < projectile.duration);
}

function finishWaveIfNeeded(game: GameState): void {
  if (game.waveState !== 'active') return;
  if (game.spawnQueue.length > 0 || game.enemies.length > 0) return;
  game.waveState = 'between';
  game.nextWaveIn = BETWEEN_WAVES_SECONDS;
}

function cellCenter(cell: Cell): Point {
  return { x: cell.x + 0.5, y: cell.y + 0.5 };
}

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

