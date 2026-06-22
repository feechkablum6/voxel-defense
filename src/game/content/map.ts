import type { Cell } from '../simulation/types';

export const MAP_WIDTH = 18;
export const MAP_HEIGHT = 12;

export const ROAD_PATH: Cell[] = [
  { x: 0, y: 5 },
  { x: 1, y: 5 },
  { x: 2, y: 5 },
  { x: 3, y: 5 },
  { x: 4, y: 5 },
  { x: 4, y: 4 },
  { x: 4, y: 3 },
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
  { x: 9, y: 3 },
  { x: 10, y: 3 },
  { x: 10, y: 4 },
  { x: 10, y: 5 },
  { x: 10, y: 6 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
  { x: 12, y: 7 },
  { x: 13, y: 7 },
  { x: 14, y: 7 },
  { x: 15, y: 7 },
  { x: 16, y: 7 },
  { x: 17, y: 7 }
];

const roadKeys = new Set(ROAD_PATH.map((cell) => `${cell.x}:${cell.y}`));

export function isInsideMap(cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < MAP_WIDTH && cell.y < MAP_HEIGHT;
}

export function isRoadCell(cell: Cell): boolean {
  return roadKeys.has(`${cell.x}:${cell.y}`);
}

