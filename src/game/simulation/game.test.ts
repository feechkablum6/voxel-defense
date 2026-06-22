import { describe, expect, it } from 'vitest';
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
});
