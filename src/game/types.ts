// === CORE TYPES ===

export type TileType = 'wall' | 'floor' | 'stairs';

export interface Position {
  x: number;
  y: number;
}

export type Verb = 'HIT' | 'HEAL' | 'TELEPORT' | 'BUFF' | 'DEBUFF';

export type Trait =
  | 'FIRE'
  | 'ICE'
  | 'POISON'
  | 'AOE'
  | 'LIFESTEAL'
  | 'PIERCING'
  | 'STUN'
  | 'KNOCKBACK';

export type ItemType = 'weapon' | 'armor' | 'consumable';

export interface Item {
  id: string;
  name: string;
  itemType: ItemType;
  verb: Verb;
  traits: Trait[];
  energyCost: number;
  power: number;
  range: number;
  description: string;
  defenseBonus?: number;
}

export type LevelUpStat = 'hp' | 'energy' | 'attack' | 'defense' | 'inventory' | 'luck' | 'dodge';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export interface Entity {
  id: string;
  name: string;
  pos: Position;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  luck: number;
  dodge: number;
  level: number;
  xp: number;
  xpToNext: number;
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  inventory: Item[];
  inventorySize: number;
  isPlayer: boolean;
  icon: string; // lucide icon name
}

export interface Tile {
  type: TileType;
  entity: Entity | null;
  item: Item | null;
  visible: boolean;
  explored: boolean;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'combat' | 'pickup' | 'system' | 'damage';
  turn: number;
}

export interface GameState {
  grid: Tile[][];
  width: number;
  height: number;
  player: Entity;
  enemies: Entity[];
  turn: number;
  log: LogEntry[];
  logIdCounter: number;
  gameOver: boolean;
  floor: number;
  targetMode: { item: Item; range: number } | null;
  pendingLevelUp: boolean;
  collectedItemIds: Set<string>;
  characterId: string;
}

export type GameAction =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'ATTACK'; targetId: string }
  | { type: 'USE_ITEM'; itemId: string; targetPos?: Position }
  | { type: 'PASS_TURN' }
  | { type: 'PICK_UP' }
  | { type: 'DESCEND' }
  | { type: 'NEW_GAME'; characterId?: string }
  | { type: 'SET_TARGET_MODE'; item: Item | null }
  | { type: 'TARGET_TILE'; pos: Position }
  | { type: 'LEVEL_UP_CHOICE'; stat: LevelUpStat };
