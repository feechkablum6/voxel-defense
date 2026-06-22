import Phaser from 'phaser';
import { MAP_HEIGHT, MAP_WIDTH, ROAD_PATH, isRoadCell } from '../content/map';
import { BASE_MAX_HP, canPlaceTower, enemyPosition, placeTower, updateGame } from '../simulation/game';
import type { Cell, Enemy, GameState, Tower, TowerKind } from '../simulation/types';

const TILE_W = 48;
const TILE_H = 38;
const ORIGIN_X = 34;
const ORIGIN_Y = 38;

type EnemyView = {
  root: Phaser.GameObjects.Container;
  hp: Phaser.GameObjects.Rectangle;
};

type TowerPointerDetail = {
  kind: TowerKind;
  clientX: number;
  clientY: number;
};

export class BattleScene extends Phaser.Scene {
  private towerViews = new Map<number, Phaser.GameObjects.Image>();
  private enemyViews = new Map<number, EnemyView>();
  private projectileLayer?: Phaser.GameObjects.Graphics;
  private hoverLayer?: Phaser.GameObjects.Graphics;
  private baseHpFill?: Phaser.GameObjects.Rectangle;
  private baseHpText?: Phaser.GameObjects.Text;

  constructor(
    private readonly state: GameState,
    private readonly onTick: () => void
  ) {
    super('battle');
  }

  preload(): void {
    this.load.svg('tile-grass', '/assets/tiles/grass.svg', { width: 96, height: 76 });
    this.load.svg('tile-sand', '/assets/tiles/sand.svg', { width: 96, height: 76 });
    this.load.svg('tower-arrow', '/assets/towers/arrow.svg', { width: 96, height: 120 });
    this.load.svg('tower-cannon', '/assets/towers/cannon.svg', { width: 96, height: 120 });
    this.load.svg('tower-frost', '/assets/towers/frost.svg', { width: 96, height: 120 });
    this.load.svg('enemy-normal', '/assets/enemies/normal.svg', { width: 76, height: 76 });
    this.load.svg('enemy-fast', '/assets/enemies/fast.svg', { width: 76, height: 76 });
    this.load.svg('enemy-tough', '/assets/enemies/tough.svg', { width: 76, height: 76 });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#122016');
    this.drawMap();
    this.projectileLayer = this.add.graphics().setDepth(30);
    this.hoverLayer = this.add.graphics().setDepth(40);
    this.bindCustomPlacement();
  }

  update(_time: number, delta: number): void {
    updateGame(this.state, Math.min(delta / 1000, 0.05));
    this.syncTowers();
    this.syncEnemies();
    this.syncBaseHp();
    this.drawProjectiles();
    this.drawHover();
    this.onTick();
  }

  clientToCell(clientX: number, clientY: number): Cell {
    const rect = this.game.canvas.getBoundingClientRect();
    const scaleX = this.game.canvas.width / rect.width;
    const scaleY = this.game.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return {
      x: Math.floor((x - ORIGIN_X) / TILE_W),
      y: Math.floor((y - ORIGIN_Y) / TILE_H)
    };
  }

  private drawMap(): void {
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const cell = { x, y };
        const key = isRoadCell(cell) ? 'tile-sand' : 'tile-grass';
        const point = cellToPixel(cell);
        this.add.image(point.x, point.y, key).setDisplaySize(TILE_W, TILE_H + 10).setDepth(y);
      }
    }
    const base = ROAD_PATH[ROAD_PATH.length - 1];
    const point = cellToPixel(base);
    this.add.rectangle(point.x + 22, point.y - 14, 26, 34, 0x8c5b34).setDepth(20);
    this.add.rectangle(point.x + 22, point.y - 32, 34, 12, 0xd8c17b).setDepth(21);
    this.add.rectangle(point.x + 22, point.y - 58, 68, 18, 0x1b211c).setOrigin(0.5).setDepth(120);
    this.baseHpFill = this.add.rectangle(point.x - 9, point.y - 58, 62, 10, 0x65c96b).setOrigin(0, 0.5).setDepth(121);
    this.baseHpText = this.add
      .text(point.x + 22, point.y - 59, `${BASE_MAX_HP}`, {
        color: '#6b6b6b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: '700'
      })
      .setOrigin(0.5)
      .setDepth(122);
  }

  private bindCustomPlacement(): void {
    window.addEventListener('tower-drag-hover', (event) => {
      const detail = (event as CustomEvent<TowerPointerDetail>).detail;
      if (!this.isPointOnCanvas(detail.clientX, detail.clientY)) {
        this.state.hover = null;
        return;
      }
      const cell = this.clientToCell(detail.clientX, detail.clientY);
      this.state.hover = { cell, valid: canPlaceTower(this.state, detail.kind, cell) };
    });
    window.addEventListener('tower-drag-drop', (event) => {
      const detail = (event as CustomEvent<TowerPointerDetail>).detail;
      if (this.isPointOnCanvas(detail.clientX, detail.clientY)) {
        placeTower(this.state, detail.kind, this.clientToCell(detail.clientX, detail.clientY));
      }
      this.state.hover = null;
    });
    window.addEventListener('tower-drag-end', () => {
      this.state.hover = null;
    });
  }

  private isPointOnCanvas(clientX: number, clientY: number): boolean {
    const rect = this.game.canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private syncTowers(): void {
    const alive = new Set<number>();
    for (const tower of this.state.towers) {
      alive.add(tower.id);
      if (!this.towerViews.has(tower.id)) this.createTower(tower);
    }
    for (const [id, view] of this.towerViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.towerViews.delete(id);
      }
    }
  }

  private createTower(tower: Tower): void {
    const point = cellToPixel(tower.cell);
    const view = this.add
      .image(point.x, point.y - 14, `tower-${tower.kind}`)
      .setDisplaySize(46, 58)
      .setDepth(50 + tower.cell.y);
    this.towerViews.set(tower.id, view);
  }

  private syncEnemies(): void {
    const alive = new Set<number>();
    for (const enemy of this.state.enemies) {
      alive.add(enemy.id);
      const view = this.enemyViews.get(enemy.id) ?? this.createEnemy(enemy);
      const pos = cellToPixel(enemyPosition(enemy));
      view.root.setPosition(pos.x, pos.y - 12).setDepth(80 + pos.y);
      view.hp.width = Math.max(2, 28 * (enemy.hp / enemy.maxHp));
    }
    for (const [id, view] of this.enemyViews) {
      if (!alive.has(id)) {
        view.root.destroy();
        this.enemyViews.delete(id);
      }
    }
  }

  private createEnemy(enemy: Enemy): EnemyView {
    const image = this.add.image(0, 0, `enemy-${enemy.kind}`).setDisplaySize(34, 34);
    const bg = this.add.rectangle(0, -23, 30, 4, 0x201815).setOrigin(0.5);
    const hp = this.add.rectangle(-14, -23, 28, 4, 0x75d36b).setOrigin(0, 0.5);
    const root = this.add.container(0, 0, [image, bg, hp]);
    const view = { root, hp };
    this.enemyViews.set(enemy.id, view);
    return view;
  }

  private syncBaseHp(): void {
    if (!this.baseHpFill || !this.baseHpText) return;
    const ratio = Phaser.Math.Clamp(this.state.baseHp / BASE_MAX_HP, 0, 1);
    this.baseHpFill.width = 62 * ratio;
    this.baseHpFill.setFillStyle(baseHpColor(ratio));
    this.baseHpText.setText(this.state.baseHp.toString());
  }

  private drawProjectiles(): void {
    const graphics = this.projectileLayer;
    if (!graphics) return;
    graphics.clear();
    for (const projectile of this.state.projectiles) {
      const from = cellToPixel(projectile.from);
      const to = cellToPixel(projectile.to);
      const color = projectile.kind === 'frost' ? 0x9ad9ff : projectile.kind === 'cannon' ? 0xffb454 : 0xf4e3a1;
      graphics.lineStyle(projectile.kind === 'cannon' ? 4 : 2, color, 0.85);
      graphics.beginPath();
      graphics.moveTo(from.x, from.y - 28);
      graphics.lineTo(to.x, to.y - 14);
      graphics.strokePath();
    }
  }

  private drawHover(): void {
    const graphics = this.hoverLayer;
    if (!graphics) return;
    graphics.clear();
    if (!this.state.hover) return;
    const point = cellToPixel(this.state.hover.cell);
    graphics.lineStyle(2, this.state.hover.valid ? 0x9cff81 : 0xff5b5b, 0.95);
    graphics.fillStyle(this.state.hover.valid ? 0x9cff81 : 0xff5b5b, 0.22);
    graphics.fillRect(point.x - TILE_W / 2, point.y - TILE_H / 2, TILE_W, TILE_H);
    graphics.strokeRect(point.x - TILE_W / 2, point.y - TILE_H / 2, TILE_W, TILE_H);
  }
}

export function cellToPixel(cell: Cell): { x: number; y: number } {
  return {
    x: ORIGIN_X + cell.x * TILE_W + TILE_W / 2,
    y: ORIGIN_Y + cell.y * TILE_H + TILE_H / 2
  };
}

function baseHpColor(ratio: number): number {
  if (ratio > 0.6) return 0x65c96b;
  if (ratio > 0.3) return 0xe0b64f;
  return 0xd85a4f;
}
