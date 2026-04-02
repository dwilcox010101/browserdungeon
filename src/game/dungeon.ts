import { Position, Tile, TileType, Entity } from './types';
import { rollItemForFloor } from './items';

const ROOM_MIN = 3;
const ROOM_MAX_BASE = 6;
const MAX_ROOMS_BASE = 5;

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
  // tier 0 — floors 1+
  { name: 'Slime', icon: 'Droplets', hp: 6, attack: 2, defense: 0, dodge: 0, luck: 0, minFloor: 1 },
  { name: 'Bat', icon: 'Bird', hp: 5, attack: 3, defense: 0, dodge: 3, luck: 0, minFloor: 1 },
  // tier 1 — floors 2+
  { name: 'Goblin', icon: 'Bug', hp: 10, attack: 3, defense: 1, dodge: 2, luck: 1, minFloor: 2 },
  // tier 2 — floors 4+
  { name: 'Skeleton', icon: 'Skull', hp: 16, attack: 5, defense: 2, dodge: 0, luck: 0, minFloor: 4 },
  // tier 3 — floors 6+
  { name: 'Wraith', icon: 'Ghost', hp: 20, attack: 7, defense: 3, dodge: 3, luck: 2, minFloor: 6 },
];


let entityIdCounter = 0;
function nextEntityId(): string {
  return `e_${++entityIdCounter}`;
}
let itemIdCounter = 0;
function nextItemId(): string {
  return `i_${++itemIdCounter}`;
}
export function resetIdCounters(): void {
  entityIdCounter = 0;
  itemIdCounter = 0;
}

export function generateDungeon(
  width: number,
  height: number,
  floor: number,
  isFinalFloor: boolean = false
): { grid: Tile[][]; playerStart: Position; enemies: Entity[]; stairs: Position } {
  // Do NOT reset counters — IDs must be globally unique across floors
  const grid = createEmptyGrid(width, height);
  const rooms: Room[] = [];

  const maxRooms = MAX_ROOMS_BASE + Math.floor(floor * 1.5);
  const roomMax = Math.min(ROOM_MAX_BASE + Math.floor(floor * 0.5), 10);

  for (let i = 0; i < maxRooms * 3 && rooms.length < maxRooms; i++) {
    const w = rand(ROOM_MIN, roomMax);
    const h = rand(ROOM_MIN, roomMax);
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
  grid[stairsPos.y][stairsPos.x].type = isFinalFloor ? 'treasure' : 'stairs';

  // Place enemies — fewer on early floors, more on later floors
  const enemies: Entity[] = [];
  const enemyCount = floor <= 2 ? rand(2, 3) : rand(3, 5) + Math.floor(floor * 0.5);
  const eligible = ENEMY_TEMPLATES.filter(t => t.minFloor <= floor);
  for (let i = 0; i < enemyCount; i++) {
    const roomIdx = rand(1, rooms.length - 1);
    const room = rooms[roomIdx];
    const pos: Position = {
      x: rand(room.x, room.x + room.w - 1),
      y: rand(room.y, room.y + room.h - 1),
    };
    if (grid[pos.y][pos.x].type === 'floor' && !grid[pos.y][pos.x].entity &&
        !(pos.x === playerStart.x && pos.y === playerStart.y)) {
      const template = eligible[rand(0, eligible.length - 1)];
      const floorBonus = Math.max(0, floor - 1); // no stat boost on floor 1
      const scaledHp = template.hp + floorBonus * 2;
      const enemy: Entity = {
        id: nextEntityId(),
        name: template.name,
        pos,
        hp: scaledHp,
        maxHp: scaledHp,
        mana: 0,
        maxMana: 0,
        attack: template.attack + Math.floor(floorBonus * 0.5),
        defense: template.defense + Math.floor(floorBonus / 3),
        luck: template.luck + Math.floor(floorBonus / 4),
        dodge: template.dodge + Math.floor(floorBonus / 4),
        level: floor,
        xp: 0,
        xpToNext: 100,
        equippedWeapon: null,
        equippedArmor: null,
        inventory: [],
        inventorySize: 0,
        isPlayer: false,
        icon: template.icon,
        statusEffects: [],
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
      const template = rollItemForFloor(floor);
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
