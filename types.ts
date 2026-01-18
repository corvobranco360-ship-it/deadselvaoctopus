
export enum GameState {
  MENU = 'MENU',
  LEVEL_SELECT = 'LEVEL_SELECT',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Point {
  x: number;
  y: number;
}

export type EnemyType = 'OCTOPUS' | 'SPIDER' | 'MOSQUITO';

export interface LevelData {
  id: number;
  map: string[];
  enemies: { type: EnemyType; x: number; y: number }[];
  arrows: number;
}

export type ItemType = 'HEART' | 'AMMO';

export interface Item {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  collected: boolean;
  floatOffset: number;
}
