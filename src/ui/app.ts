import { TOWER_ORDER, TOWER_CONFIGS } from '../game/content/towers';
import { playGame, resetGame, startWave } from '../game/simulation/game';
import type { GameState, TowerKind } from '../game/simulation/types';
import './styles.css';

type Language = 'ru' | 'en';

export interface UiHandle {
  update: () => void;
}

export function createUi(root: HTMLElement, state: GameState): UiHandle {
  let language: Language = 'ru';
  let settingsOpen = false;

  root.innerHTML = `
    <main class="game-shell">
      <section class="stage">
        <div id="game-canvas" class="canvas-slot"></div>
        <div class="menu-layer" data-layer="menu">
          <h1>Voxel Defense</h1>
          <div class="menu-actions">
            <button class="primary-action" data-action="play" data-i18n="play" data-tip="Старт">Играть</button>
            <button class="secondary-action" data-action="settings" data-i18n="settings" data-tip="Настройки">Настройки</button>
          </div>
          <div class="settings-panel hidden" data-layer="settings">
            <div class="setting-row">
              <span data-i18n="language">Язык</span>
              <div class="language-toggle">
                <button data-language="ru">Русский</button>
                <button data-language="en">English</button>
              </div>
            </div>
          </div>
        </div>
        <div class="menu-layer hidden" data-layer="gameover">
          <h1>Game Over</h1>
          <button class="primary-action" data-action="restart" data-i18n="restart" data-tip="Новая попытка">Заново</button>
        </div>
      </section>
      <aside class="hud">
        <div class="brand">Voxel Defense</div>
        <div class="meters">
          <div data-tip="Монеты"><span data-i18n="coins">Монеты</span><strong data-value="coins">150</strong></div>
          <div data-tip="HP базы"><span data-i18n="base">База</span><strong data-value="hp">100</strong></div>
          <div data-tip="Волна"><span data-i18n="wave">Волна</span><strong data-value="wave">0</strong></div>
        </div>
        <div class="tower-list" data-towers></div>
        <button class="wave-action" data-action="wave" data-i18n="wave" data-tip="Начать раньше">Волна</button>
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
    if (action === 'settings') settingsOpen = !settingsOpen;
    update();
  });

  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-language]');
    const selected = button?.dataset.language as Language | undefined;
    if (!selected) return;
    language = selected;
    update();
  });

  root.addEventListener('dragstart', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-tower]');
    const kind = button?.dataset.tower as TowerKind | undefined;
    if (!kind) return;
    event.dataTransfer?.setData('text/tower', kind);
    event.dataTransfer?.setData('text/plain', kind);
    const preview = createDragPreview(kind);
    document.body.append(preview);
    event.dataTransfer?.setDragImage(preview, 27, 34);
    window.setTimeout(() => preview.remove(), 0);
  });

  function update(): void {
    setText(root, 'coins', state.coins.toString());
    setText(root, 'hp', state.baseHp.toString());
    setText(root, 'wave', state.wave.toString());
    root.querySelector('[data-layer="menu"]')?.classList.toggle('hidden', state.phase !== 'menu');
    root.querySelector('[data-layer="gameover"]')?.classList.toggle('hidden', state.phase !== 'gameover');
    root.querySelector('[data-layer="settings"]')?.classList.toggle('hidden', !settingsOpen);
    const waveButton = root.querySelector<HTMLButtonElement>('[data-action="wave"]');
    if (waveButton) {
      waveButton.disabled = state.phase !== 'playing' || state.waveState === 'active';
      waveButton.textContent =
        state.waveState === 'between'
          ? `${copy(language).wave} ${Math.ceil(state.nextWaveIn)}`
          : copy(language).wave;
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tower]')) {
      const kind = button.dataset.tower as TowerKind;
      button.disabled = state.coins < TOWER_CONFIGS[kind].cost || state.phase === 'gameover';
    }
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (key && key in copy(language)) node.textContent = copy(language)[key as keyof ReturnType<typeof copy>];
    });
    root.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((node) => {
      node.classList.toggle('selected', node.dataset.language === language);
    });
    updateTowerLabels(root, language);
    updateTips(root, language);
  }

  update();
  return { update };
}

function towerButton(kind: TowerKind): string {
  const tower = TOWER_CONFIGS[kind];
  const hint = towerHint(kind, 'ru');
  return `
    <button class="tower-button tower-${kind}" draggable="true" data-tower="${kind}" data-tip="${hint}">
      <span class="tower-icon"></span>
      <span data-tower-label>${towerName(kind, 'ru')}</span>
      <strong>${tower.cost}</strong>
    </button>
  `;
}

function setText(root: HTMLElement, key: string, value: string): void {
  const node = root.querySelector(`[data-value="${key}"]`);
  if (node) node.textContent = value;
}

function createDragPreview(kind: TowerKind): HTMLElement {
  const preview = document.createElement('div');
  preview.className = `drag-preview tower-${kind}`;
  preview.innerHTML = '<span class="tower-icon"></span>';
  return preview;
}

function updateTowerLabels(root: HTMLElement, language: Language): void {
  root.querySelectorAll<HTMLElement>('[data-tower]').forEach((button) => {
    const kind = button.dataset.tower as TowerKind;
    const label = button.querySelector<HTMLElement>('[data-tower-label]');
    if (label) label.textContent = towerName(kind, language);
  });
}

function updateTips(root: HTMLElement, language: Language): void {
  const text = copy(language);
  root.querySelector<HTMLElement>('[data-action="play"]')?.setAttribute('data-tip', text.playTip);
  root.querySelector<HTMLElement>('[data-action="settings"]')?.setAttribute('data-tip', text.settings);
  root.querySelector<HTMLElement>('[data-action="restart"]')?.setAttribute('data-tip', text.restartTip);
  root.querySelector<HTMLElement>('[data-action="wave"]')?.setAttribute('data-tip', text.waveTip);
  root.querySelectorAll<HTMLElement>('[data-tower]').forEach((button) => {
    button.setAttribute('data-tip', towerHint(button.dataset.tower as TowerKind, language));
  });
}

function towerName(kind: TowerKind, language: Language): string {
  const names = {
    ru: { arrow: 'Стрелка', cannon: 'Пушка', frost: 'Мороз' },
    en: { arrow: 'Arrow', cannon: 'Cannon', frost: 'Frost' }
  };
  return names[language][kind];
}

function towerHint(kind: TowerKind, language: Language): string {
  const tower = TOWER_CONFIGS[kind];
  const effect = {
    ru: tower.projectile === 'frost' ? 'замедляет' : 'урон',
    en: tower.projectile === 'frost' ? 'slows' : 'damage'
  };
  return `${towerName(kind, language)} · ${effect[language]} · ${tower.cost}`;
}

function copy(language: Language) {
  return {
    ru: {
      play: 'Играть',
      playTip: 'Старт',
      settings: 'Настройки',
      language: 'Язык',
      restart: 'Заново',
      restartTip: 'Новая попытка',
      coins: 'Монеты',
      base: 'База',
      wave: 'Волна',
      waveTip: 'Начать раньше'
    },
    en: {
      play: 'Play',
      playTip: 'Start',
      settings: 'Settings',
      language: 'Language',
      restart: 'Restart',
      restartTip: 'New run',
      coins: 'Coins',
      base: 'Base',
      wave: 'Wave',
      waveTip: 'Start early'
    }
  }[language];
}
