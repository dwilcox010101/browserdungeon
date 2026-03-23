import { Position, Tile, TileType, Entity, Item } from './types';

const ROOM_MIN = 4;
const ROOM_MAX = 8;
const MAX_ROOMS = 12;

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function createEmptyGrid(width: number, height: number): Tile[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: 'wall' as TileType,
      entity: null,
      item: null,
      visible: false,
      explored: false,
    }))
  );
}

function carveRoom(grid: Tile[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
        grid[y][x].type = 'floor';
      }
    }
  }
}

function carveCorridor(grid: Tile[][], from: Position, to: Position) {
  let { x, y } = from;
  while (x !== to.x) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      grid[y][x].type = 'floor';
    }
    x += x < to.x ? 1 : -1;
  }
  while (y !== to.y) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      grid[y][x].type = 'floor';
    }
    y += y < to.y ? 1 : -1;
  }
}

function roomCenter(room: Room): Position {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function roomsOverlap(a: Room, b: Room, padding = 1): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ENEMY_TEMPLATES = [
  { name: 'Goblin', icon: 'Bug', hp: 12, attack: 3, defense: 1, dodge: 2, luck: 1 },
  { name: 'Skeleton', icon: 'Skull', hp: 18, attack: 5, defense: 2, dodge: 0, luck: 0 },
  { name: 'Slime', icon: 'Droplets', hp: 8, attack: 2, defense: 0, dodge: 0, luck: 0 },
  { name: 'Bat', icon: 'Bird', hp: 6, attack: 4, defense: 0, dodge: 5, luck: 1 },
  { name: 'Wraith', icon: 'Ghost', hp: 22, attack: 7, defense: 3, dodge: 3, luck: 2 },
];

const ITEM_POOL: Omit<Item, 'id'>[] = [
  { name: 'Fire Scroll', itemType: 'consumable', verb: 'HIT', traits: ['FIRE', 'AOE'], energyCost: 3, power: 10, range: 3, description: 'Launches a fiery blast hitting nearby enemies' },
  { name: 'Healing Potion', itemType: 'consumable', verb: 'HEAL', traits: [], energyCost: 2, power: 15, range: 0, description: 'Restores health' },
  { name: 'Ice Shard', itemType: 'consumable', verb: 'HIT', traits: ['ICE', 'STUN'], energyCost: 3, power: 8, range: 4, description: 'Freezes and stuns a target' },
  { name: 'Poison Dagger', itemType: 'weapon', verb: 'HIT', traits: ['POISON', 'PIERCING'], energyCost: 2, power: 6, range: 1, description: 'Venomous strike that ignores armor' },
  { name: 'Vampiric Blade', itemType: 'weapon', verb: 'HIT', traits: ['LIFESTEAL'], energyCost: 3, power: 8, range: 1, description: 'Drains life from the target' },
  { name: 'Teleport Stone', itemType: 'consumable', verb: 'TELEPORT', traits: [], energyCost: 4, power: 0, range: 6, description: 'Teleport to a visible tile' },
  { name: 'War Cry', itemType: 'consumable', verb: 'BUFF', traits: [], energyCost: 2, power: 3, range: 0, description: 'Temporarily boosts attack' },
  { name: 'Iron Shield', itemType: 'armor', verb: 'BUFF', traits: [], energyCost: 0, power: 0, range: 0, description: 'A sturdy shield. +2 DEF', defenseBonus: 2 },
  { name: 'Chainmail', itemType: 'armor', verb: 'BUFF', traits: [], energyCost: 0, power: 0, range: 0, description: 'Light chainmail. +3 DEF', defenseBonus: 3 },
  { name: 'Steel Sword', itemType: 'weapon', verb: 'HIT', traits: [], energyCost: 1, power: 8, range: 1, description: 'A reliable steel sword' },
];

let entityIdCounter = 0;
function nextEntityId(): string {
  return `e_${++entityIdCounter}`;
}
let itemIdCounter = 0;
function nextItemId(): string {
  return `i_${++itemIdCounter}`;
}

export function generateDungeon(
  width: number,
  height: number,
  floor: number
): { grid: Tile[][]; playerStart: Position; enemies: Entity[]; stairs: Position } {
  entityIdCounter = 0;
  itemIdCounter = 0;
  const grid = createEmptyGrid(width, height);
  const rooms: Room[] = [];

  for (let i = 0; i < MAX_ROOMS * 3 && rooms.length < MAX_ROOMS; i++) {
    const w = rand(ROOM_MIN, ROOM_MAX);
    const h = rand(ROOM_MIN, ROOM_MAX);
    const x = rand(1, width - w - 1);
    const y = rand(1, height - h - 1);
    const room: Room = { x, y, w, h };

    if (!rooms.some((r) => roomsOverlap(r, room))) {
      rooms.push(room);
      carveRoom(grid, room);
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, roomCenter(rooms[i - 1]), roomCenter(rooms[i]));
  }

  const playerStart = roomCenter(rooms[0]);

  const stairsPos = roomCenter(rooms[rooms.length - 1]);
  grid[stairsPos.y][stairsPos.x].type = 'stairs';

  // Place enemies
  const enemies: Entity[] = [];
  const enemyCount = rand(3, 5) + floor;
  for (let i = 0; i < enemyCount; i++) {
    const roomIdx = rand(1, rooms.length - 1);
    const room = rooms[roomIdx];
    const pos: Position = {
      x: rand(room.x, room.x + room.w - 1),
      y: rand(room.y, room.y + room.h - 1),
    };
    if (grid[pos.y][pos.x].type === 'floor' && !grid[pos.y][pos.x].entity &&
        !(pos.x === playerStart.x && pos.y === playerStart.y)) {
      const template = ENEMY_TEMPLATES[rand(0, ENEMY_TEMPLATES.length - 1)];
      const scaledHp = template.hp + floor * 3;
      const enemy: Entity = {
        id: nextEntityId(),
        name: template.name,
        pos,
        hp: scaledHp,
        maxHp: scaledHp,
        energy: 2,
        maxEnergy: 2,
        attack: template.attack + floor,
        defense: template.defense + Math.floor(floor / 2),
        luck: template.luck + Math.floor(floor / 3),
        dodge: template.dodge + Math.floor(floor / 3),
        level: floor,
        xp: 0,
        xpToNext: 100,
        equippedWeapon: null,
        equippedArmor: null,
        inventory: [],
        inventorySize: 0,
        isPlayer: false,
        icon: template.icon,
      };
      grid[pos.y][pos.x].entity = enemy;
      enemies.push(enemy);
    }
  }

  // Place items
  const itemCount = rand(2, 4);
  for (let i = 0; i < itemCount; i++) {
    const roomIdx = rand(0, rooms.length - 1);
    const room = rooms[roomIdx];
    const pos: Position = {
      x: rand(room.x, room.x + room.w - 1),
      y: rand(room.y, room.y + room.h - 1),
    };
    if (grid[pos.y][pos.x].type === 'floor' && !grid[pos.y][pos.x].item && !grid[pos.y][pos.x].entity) {
      const template = ITEM_POOL[rand(0, ITEM_POOL.length - 1)];
      grid[pos.y][pos.x].item = { ...template, id: nextItemId() };
    }
  }

  return { grid, playerStart, enemies, stairs: stairsPos };
}

// Simple FOV
export function computeFOV(grid: Tile[][], center: Position, radius: number): Tile[][] {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      grid[y][x].visible = false;
    }
  }

  for (let y = Math.max(0, center.y - radius); y <= Math.min(grid.length - 1, center.y + radius); y++) {
    for (let x = Math.max(0, center.x - radius); x <= Math.min(grid[0].length - 1, center.x + radius); x++) {
      const dist = Math.abs(x - center.x) + Math.abs(y - center.y);
      if (dist <= radius) {
        if (hasLineOfSight(grid, center, { x, y })) {
          grid[y][x].visible = true;
          grid[y][x].explored = true;
        }
      }
    }
  }

  return grid;
}

function hasLineOfSight(grid: Tile[][], from: Position, to: Position): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let err = dx - dy;
  let { x, y } = from;

  while (x !== to.x || y !== to.y) {
    if (grid[y][x].type === 'wall' && !(x === from.x && y === from.y)) {
      return false;
    }
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}
