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
  let activeDrag: { kind: TowerKind; preview: HTMLElement; pointerId: number } | null = null;

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
          <div data-tip="Волна"><span data-i18n="wave">Волна</span><strong data-value="wave">0</strong></div>
        </div>
        <div class="tower-list" data-towers></div>
        <div class="wave-controls">
          <div class="wave-timer hidden" data-wave-timer data-tip="Автостарт">Авто: 8с</div>
          <button class="wave-action" data-action="wave" data-i18n="wave" data-tip="Начать раньше">Волна</button>
        </div>
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

  root.addEventListener('pointerdown', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tower]');
    if (!button) return;
    const kind = button.dataset.tower as TowerKind | undefined;
    if (!kind || button.disabled) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const preview = createDragPreview(kind);
    document.body.append(preview);
    activeDrag = { kind, preview, pointerId: event.pointerId };
    document.body.classList.add('dragging-tower');
    moveDragPreview(preview, event.clientX, event.clientY);
    sendTowerEvent('tower-drag-hover', kind, event);
  });

  root.addEventListener('pointermove', (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    event.preventDefault();
    moveDragPreview(activeDrag.preview, event.clientX, event.clientY);
    sendTowerEvent('tower-drag-hover', activeDrag.kind, event);
  });

  root.addEventListener('pointerup', (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    sendTowerEvent('tower-drag-drop', activeDrag.kind, event);
    stopTowerDrag();
  });

  root.addEventListener('pointercancel', stopTowerDrag);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') stopTowerDrag();
  });

  function stopTowerDrag(): void {
    activeDrag?.preview.remove();
    activeDrag = null;
    document.body.classList.remove('dragging-tower');
    window.dispatchEvent(new CustomEvent('tower-drag-end'));
  }

  function update(): void {
    const text = copy(language);
    setText(root, 'coins', state.coins.toString());
    setText(root, 'wave', state.wave.toString());
    root.querySelector('[data-layer="menu"]')?.classList.toggle('hidden', state.phase !== 'menu');
    root.querySelector('[data-layer="gameover"]')?.classList.toggle('hidden', state.phase !== 'gameover');
    root.querySelector('[data-layer="settings"]')?.classList.toggle('hidden', !settingsOpen);
    const waveButton = root.querySelector<HTMLButtonElement>('[data-action="wave"]');
    if (waveButton) {
      waveButton.disabled = state.phase !== 'playing' || state.waveState === 'active';
      waveButton.textContent = text.wave;
    }
    const waveTimer = root.querySelector<HTMLElement>('[data-wave-timer]');
    if (waveTimer) {
      const visible = state.phase === 'playing' && state.waveState === 'between';
      waveTimer.classList.toggle('hidden', !visible);
      waveTimer.textContent = `${text.autoWave} ${Math.ceil(state.nextWaveIn)}с`;
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-tower]')) {
      const kind = button.dataset.tower as TowerKind;
      button.disabled = state.coins < TOWER_CONFIGS[kind].cost || state.phase === 'gameover';
    }
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (key && key in text) node.textContent = text[key as keyof ReturnType<typeof copy>];
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
    <button class="tower-button tower-${kind}" type="button" data-tower="${kind}" data-tip="${hint}">
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
  preview.innerHTML = '<span class="tower-model"><i></i><b></b><em></em></span>';
  return preview;
}

function moveDragPreview(preview: HTMLElement, x: number, y: number): void {
  preview.style.transform = `translate(${x - 26}px, ${y - 54}px)`;
}

function sendTowerEvent(type: string, kind: TowerKind, event: PointerEvent): void {
  window.dispatchEvent(
    new CustomEvent(type, {
      detail: { kind, clientX: event.clientX, clientY: event.clientY }
    })
  );
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
  root.querySelector<HTMLElement>('[data-wave-timer]')?.setAttribute('data-tip', text.autoWaveTip);
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
      wave: 'Волна',
      waveTip: 'Начать раньше',
      autoWave: 'Авто:',
      autoWaveTip: 'До автоволны'
    },
    en: {
      play: 'Play',
      playTip: 'Start',
      settings: 'Settings',
      language: 'Language',
      restart: 'Restart',
      restartTip: 'New run',
      coins: 'Coins',
      wave: 'Wave',
      waveTip: 'Start early',
      autoWave: 'Auto:',
      autoWaveTip: 'Until auto wave'
    }
  }[language];
}
