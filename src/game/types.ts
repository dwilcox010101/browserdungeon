// === CORE TYPES ===

export type TileType = 'wall' | 'floor' | 'stairs' | 'treasure';

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

export type StatusEffectType = 'poison' | 'burning' | 'frozen' | 'stunned' | 'regen' | 'fear';

export interface StatusEffect {
  type: StatusEffectType;
  turnsLeft: number;
  power: number; // damage per tick, heal per tick, etc.
  sourceId: string; // who applied it
}

export type ItemType = 'weapon' | 'armor' | 'consumable';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  itemType: ItemType;
  rarity: Rarity;
  verb: Verb;
  traits: Trait[];
  manaCost: number;
  power: number;
  range: number;
  description: string;
  defenseBonus?: number;
}

export type LevelUpStat = 'hp' | 'mana' | 'attack' | 'defense' | 'inventory' | 'luck' | 'agility';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export interface Entity {
  id: string;
  name: string;
  pos: Position;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  luck: number;
  agility: number;
  level: number;
  xp: number;
  xpToNext: number;
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  inventory: Item[];
  inventorySize: number;
  isPlayer: boolean;
  icon: string;
  statusEffects: StatusEffect[];
  speed: number;        // tiles per turn (1 = normal, 2 = fast)
  rangeAttack: number;  // 0 = melee only, >0 = can attack from that range
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

export type GameEventType = 
  | 'player_attack' | 'player_hit' | 'enemy_killed' | 'player_dodge' | 'enemy_dodge'
  | 'pickup' | 'level_up' | 'descend' | 'heal' | 'crit' | 'no_mana' | 'game_over' | 'victory'
  | 'ranged_attack';

export interface GameEvent {
  type: GameEventType;
  pos?: Position;
  amount?: number;
  entityId?: string;
  fromPos?: Position;
  toPos?: Position;
  traits?: Trait[];
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
  victory: boolean;
  floor: number;
  targetMode: { item: Item; range: number } | null;
  pendingLevelUp: boolean;
  collectedItemIds: Set<string>;
  characterId: string;
  events: GameEvent[];
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
  | { type: 'LEVEL_UP_CHOICE'; stat: LevelUpStat }
  | { type: 'DROP_ITEM'; itemId: string };
