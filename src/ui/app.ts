import { TOWER_ORDER, TOWER_CONFIGS } from '../game/content/towers';
import { playGame, resetGame, startWave } from '../game/simulation/game';
import type { GameState, TowerKind } from '../game/simulation/types';
import './styles.css';

export interface UiHandle {
  update: () => void;
}

export function createUi(root: HTMLElement, state: GameState): UiHandle {
  root.innerHTML = `
    <main class="game-shell">
      <section class="stage">
        <div id="game-canvas" class="canvas-slot"></div>
        <div class="menu-layer" data-layer="menu">
          <h1>Voxel Defense</h1>
          <button class="primary-action" data-action="play" data-tip="Start">Play</button>
        </div>
        <div class="menu-layer hidden" data-layer="gameover">
          <h1>Game Over</h1>
          <button class="primary-action" data-action="restart" data-tip="New run">Restart</button>
        </div>
      </section>
      <aside class="hud">
        <div class="brand">Voxel Defense</div>
        <div class="meters">
          <div data-tip="Coins"><span>Coins</span><strong data-value="coins">150</strong></div>
          <div data-tip="Base HP"><span>Base</span><strong data-value="hp">100</strong></div>
          <div data-tip="Wave"><span>Wave</span><strong data-value="wave">0</strong></div>
        </div>
        <div class="tower-list" data-towers></div>
        <button class="wave-action" data-action="wave" data-tip="Start early">Wave</button>
      </aside>
    </main>
  `;

  const towerList = root.querySelector<HTMLElement>('[data-towers]');
  if (!towerList) throw new Error('Tower list missing');
  towerList.innerHTML = TOWER_ORDER.map((kind) => towerButton(kind)).join('');

  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'play') playGame(state);
    if (action === 'restart') resetGame(state);
    if (action === 'wave') startWave(state);
    update();
  });

  root.addEventListener('dragstart', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-tower]');
    const kind = button?.dataset.tower as TowerKind | undefined;
    if (!kind) return;
    event.dataTransfer?.setData('text/tower', kind);
    event.dataTransfer?.setData('text/plain', kind);
  });

  function update(): void {
    setText(root, 'coins', state.coins.toString());
    setText(root, 'hp', state.baseHp.toString());
    setText(root, 'wave', state.wave.toString());
    root.querySelector('[data-layer="menu"]')?.classList.toggle('hidden', state.phase !== 'menu');
    root.querySelector('[data-layer="gameover"]')?.classList.toggle('hidden', state.phase !== 'gameover');
    const waveButton = root.querySelector<HTMLButtonElement>('[data-action="wave"]');
    if (waveButton) {
      waveButton.disabled = state.phase !== 'playing' || state.waveState === 'active';
      waveButton.textContent = state.waveState === 'between' ? `Wave ${Math.ceil(state.nextWaveIn)}` : 'Wave';
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tower]')) {
      const kind = button.dataset.tower as TowerKind;
      button.disabled = state.coins < TOWER_CONFIGS[kind].cost || state.phase === 'gameover';
    }
  }

  update();
  return { update };
}

function towerButton(kind: TowerKind): string {
  const tower = TOWER_CONFIGS[kind];
  const hint = `${tower.label} · ${tower.projectile === 'frost' ? 'slows' : 'damage'} · ${tower.cost}`;
  return `
    <button class="tower-button tower-${kind}" draggable="true" data-tower="${kind}" data-tip="${hint}">
      <span class="tower-icon"></span>
      <span>${tower.label}</span>
      <strong>${tower.cost}</strong>
    </button>
  `;
}

function setText(root: HTMLElement, key: string, value: string): void {
  const node = root.querySelector(`[data-value="${key}"]`);
  if (node) node.textContent = value;
}

