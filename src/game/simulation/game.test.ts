import { describe, expect, it } from 'vitest';
import { MAP_WIDTH, ROAD_PATH, isInsideMap } from '../content/map';
import { createGame, placeTower, playGame, startWave, updateGame } from './game';

describe('game simulation', () => {
  it('runs a wave, pays coins for kills, and damages the base when enemies leak', () => {
    const game = createGame();
    playGame(game);

    expect(placeTower(game, 'arrow', { x: 3, y: 3 }).ok).toBe(true);
    expect(game.coins).toBe(110);

    startWave(game);
    for (let i = 0; i < 900; i += 1) {
      updateGame(game, 1 / 30);
    }

    expect(game.wave).toBe(1);
    expect(game.coins).toBeGreaterThan(110);
    expect(game.baseHp).toBeLessThanOrEqual(100);
  });

  it('rejects towers on the road and occupied cells', () => {
    const game = createGame();
    playGame(game);

    expect(placeTower(game, 'arrow', { x: 0, y: 5 }).ok).toBe(false);
    expect(placeTower(game, 'arrow', { x: 2, y: 2 }).ok).toBe(true);
    expect(placeTower(game, 'cannon', { x: 2, y: 2 }).ok).toBe(false);
  });

  it('starts projectiles from the tower cell', () => {
    const game = createGame();
    playGame(game);

    expect(placeTower(game, 'arrow', { x: 2, y: 2 }).ok).toBe(true);
    startWave(game);
    for (let i = 0; i < 120 && game.projectiles.length === 0; i += 1) {
      updateGame(game, 1 / 30);
    }

    expect(game.projectiles[0]?.from).toEqual({ x: 2, y: 2 });
  });

  it('keeps the base in the free strip outside the buildable map', () => {
    const base = ROAD_PATH[ROAD_PATH.length - 1];

    expect(base.x).toBe(MAP_WIDTH);
    expect(isInsideMap(base)).toBe(false);
  });
});
