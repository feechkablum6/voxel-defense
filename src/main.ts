import Phaser from 'phaser';
import { BattleScene } from './game/phaser/BattleScene';
import { createGame } from './game/simulation/game';
import { createUi } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root missing');

const state = createGame();
const ui = createUi(root, state);
const parent = document.querySelector<HTMLElement>('#game-canvas');
if (!parent) throw new Error('Canvas slot missing');

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 930,
  height: 560,
  backgroundColor: '#122016',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [new BattleScene(state, ui.update)]
});

