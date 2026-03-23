import { GameState, GameAction, Entity, Position, LogEntry, Trait, Item, Verb, LevelUpStat } from './types';
import { generateDungeon, computeFOV } from './dungeon';
import { CHARACTERS, CharacterDef, recordFloorReached } from './characters';

const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;
const FOV_RADIUS = 7;
const INITIAL_INVENTORY_SIZE = 4;

function addLog(state: GameState, message: string, type: LogEntry['type'] = 'info'): LogEntry {
  return {
    id: state.logIdCounter++,
    message,
    type,
    turn: state.turn,
  };
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function cloneGrid(state: GameState): GameState {
  const grid = state.grid.map(row => row.map(tile => ({ ...tile })));
  return { ...state, grid, log: [...state.log], enemies: [...state.enemies], collectedItemIds: new Set(state.collectedItemIds) };
}

function checkItemOnGround(s: GameState): void {
  const tile = s.grid[s.player.pos.y][s.player.pos.x];
  if (tile.item) {
    s.log.push(addLog(s, `You see a ${tile.item.name} on the ground here.`, 'info'));
  }
}

// === VERB/TRAIT RESOLUTION ===

function resolveVerb(
  verb: Verb,
  traits: Trait[],
  power: number,
  user: Entity,
  targets: Entity[],
  state: GameState
): { damage: number; healed: number; messages: string[] } {
  let damage = power;
  let healed = 0;
  const messages: string[] = [];

  if (traits.includes('FIRE')) damage = Math.floor(damage * 1.3);
  if (traits.includes('ICE')) damage = Math.floor(damage * 1.1);

  switch (verb) {
    case 'HIT': {
      const actualTargets = traits.includes('AOE') ? targets : targets.slice(0, 1);
      actualTargets.forEach(t => {
        const def = traits.includes('PIERCING') ? 0 : t.defense;
        const finalDmg = Math.max(1, damage - def);
        t.hp -= finalDmg;
        messages.push(`${user.name} hits ${t.name} for ${finalDmg} damage`);
        if (traits.includes('LIFESTEAL')) {
          const heal = Math.floor(finalDmg * 0.3);
          user.hp = Math.min(user.maxHp, user.hp + heal);
          messages.push(`${user.name} drains ${heal} HP`);
        }
        if (traits.includes('POISON')) messages.push(`${t.name} is poisoned!`);
        if (traits.includes('STUN')) messages.push(`${t.name} is stunned!`);
      });
      break;
    }
    case 'HEAL':
      healed = power;
      user.hp = Math.min(user.maxHp, user.hp + healed);
      messages.push(`${user.name} heals for ${healed} HP`);
      break;
    case 'BUFF':
      user.attack += power;
      messages.push(`${user.name}'s attack increased by ${power}!`);
      break;
    case 'TELEPORT':
      messages.push(`${user.name} teleports!`);
      break;
    case 'DEBUFF':
      targets.forEach(t => {
        t.attack = Math.max(0, t.attack - power);
        messages.push(`${t.name}'s attack reduced by ${power}`);
      });
      break;
  }

  return { damage, healed, messages };
}

// === ENEMY AI ===

function getPlayerDefense(player: Entity): number {
  return player.defense + (player.equippedArmor?.defenseBonus ?? 0);
}

function moveEnemyTowardPlayer(state: GameState, enemy: Entity): void {
  const player = state.player;
  const dist = manhattan(enemy.pos, player.pos);
  if (dist <= 1) {
    const dmg = Math.max(1, enemy.attack - getPlayerDefense(player));
    player.hp -= dmg;
    state.log.push(addLog(state, `${enemy.name} attacks you for ${dmg} damage!`, 'damage'));
    if (player.hp <= 0) {
      state.gameOver = true;
      state.log.push(addLog(state, 'You have been slain...', 'system'));
    }
    return;
  }

  if (dist > FOV_RADIUS + 2) return;

  const dx = Math.sign(player.pos.x - enemy.pos.x);
  const dy = Math.sign(player.pos.y - enemy.pos.y);
  const moves: Position[] = [
    { x: enemy.pos.x + dx, y: enemy.pos.y },
    { x: enemy.pos.x, y: enemy.pos.y + dy },
  ].filter(p =>
    p.x >= 0 && p.x < state.width && p.y >= 0 && p.y < state.height &&
    state.grid[p.y][p.x].type !== 'wall' && !state.grid[p.y][p.x].entity
  );

  if (moves.length > 0) {
    state.grid[enemy.pos.y][enemy.pos.x].entity = null;
    enemy.pos = moves[0];
    state.grid[enemy.pos.y][enemy.pos.x].entity = enemy;
  }
}

function processEnemyTurns(state: GameState): void {
  state.enemies.forEach(enemy => {
    if (enemy.hp > 0) {
      moveEnemyTowardPlayer(state, enemy);
    }
  });
}

// === XP & LEVELING ===

function checkLevelUp(s: GameState): void {
  if (s.player.xp >= s.player.xpToNext) {
    s.player.level++;
    s.player.xp -= s.player.xpToNext;
    s.player.xpToNext = Math.floor(s.player.xpToNext * 1.5);
    s.player.hp = s.player.maxHp; // full heal on level up
    s.pendingLevelUp = true;
    s.log.push(addLog(s, `Level up! You are now level ${s.player.level}! Choose a stat to improve.`, 'system'));
  }
}

function applyLevelUpChoice(s: GameState, stat: LevelUpStat): void {
  switch (stat) {
    case 'hp':
      s.player.maxHp += 5;
      s.player.hp = Math.min(s.player.hp + 5, s.player.maxHp);
      s.log.push(addLog(s, 'Max HP increased by 5!', 'system'));
      break;
    case 'energy':
      s.player.maxEnergy += 1;
      s.player.energy = Math.min(s.player.energy + 1, s.player.maxEnergy);
      s.log.push(addLog(s, 'Max Energy increased by 1!', 'system'));
      break;
    case 'attack':
      s.player.attack += 2;
      s.log.push(addLog(s, 'Attack increased by 2!', 'system'));
      break;
    case 'defense':
      s.player.defense += 1;
      s.log.push(addLog(s, 'Defense increased by 1!', 'system'));
      break;
    case 'inventory':
      s.player.inventorySize += 1;
      s.log.push(addLog(s, 'Inventory size increased by 1!', 'system'));
      break;
  }
  s.pendingLevelUp = false;
}

function grantXp(s: GameState, amount: number, reason: string): void {
  s.player.xp += amount;
  s.log.push(addLog(s, `+${amount} XP (${reason})`, 'info'));
  checkLevelUp(s);
}

// === INITIAL STATE ===

export function createInitialState(characterId: string = 'warrior'): GameState {
  const charDef = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
  const { grid, playerStart, enemies } = generateDungeon(MAP_WIDTH, MAP_HEIGHT, 1);

  let itemIdCounter = 100;
  const startWeapon: Item = { ...charDef.startWeapon, id: `start_weapon_${itemIdCounter++}` };
  const startArmor: Item | null = charDef.startArmor ? { ...charDef.startArmor, id: `start_armor_${itemIdCounter++}` } : null;
  const startItems: Item[] = charDef.startItems.map(i => ({ ...i, id: `start_item_${itemIdCounter++}` }));

  const player: Entity = {
    id: 'player',
    name: charDef.name,
    pos: playerStart,
    hp: charDef.hp,
    maxHp: charDef.hp,
    energy: charDef.energy,
    maxEnergy: charDef.energy,
    attack: charDef.attack,
    defense: charDef.defense,
    level: 1,
    xp: 0,
    xpToNext: 20,
    equippedWeapon: startWeapon,
    equippedArmor: startArmor,
    inventory: startItems,
    inventorySize: charDef.inventorySize,
    isPlayer: true,
    icon: charDef.icon,
  };

  grid[playerStart.y][playerStart.x].entity = player;
  const fovGrid = computeFOV(grid, playerStart, FOV_RADIUS);

  const state: GameState = {
    grid: fovGrid,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    player,
    enemies,
    turn: 1,
    log: [],
    logIdCounter: 0,
    gameOver: false,
    floor: 1,
    targetMode: null,
    pendingLevelUp: false,
    collectedItemIds: new Set(),
    characterId,
  };

  state.log.push(addLog(state, `${charDef.name} descends into the dungeon...`, 'system'));
  state.log.push(addLog(state, 'Use WASD or arrow keys to move. Click items in inventory to use them.', 'system'));

  return state;
}

// === REDUCER ===

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.gameOver && action.type !== 'NEW_GAME') return state;
  // Block actions while level up pending (except choosing)
  if (state.pendingLevelUp && action.type !== 'LEVEL_UP_CHOICE' && action.type !== 'NEW_GAME') return state;

  let s = cloneGrid(state);

  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState(action.characterId || state.characterId);

    case 'LEVEL_UP_CHOICE': {
      applyLevelUpChoice(s, action.stat);
      return s;
    }

    case 'SET_TARGET_MODE': {
      s.targetMode = action.item ? { item: action.item, range: action.item.range } : null;
      return s;
    }

    case 'TARGET_TILE': {
      if (!s.targetMode) return s;
      const { item } = s.targetMode;
      const { pos } = action;
      const dist = manhattan(s.player.pos, pos);

      if (dist > s.targetMode.range) {
        s.log.push(addLog(s, 'Target out of range!', 'system'));
        return s;
      }

      if (s.player.energy < item.energyCost) {
        s.log.push(addLog(s, 'Not enough energy!', 'system'));
        return s;
      }

      s.player.energy -= item.energyCost;

      if (item.verb === 'TELEPORT') {
        if (s.grid[pos.y][pos.x].type !== 'wall' && !s.grid[pos.y][pos.x].entity) {
          s.grid[s.player.pos.y][s.player.pos.x].entity = null;
          s.player.pos = pos;
          s.grid[pos.y][pos.x].entity = s.player;
          s.log.push(addLog(s, 'You teleport!', 'info'));
          checkItemOnGround(s);
        }
      } else {
        const targets: Entity[] = [];
        const aoeRange = item.traits.includes('AOE') ? 2 : 0;
        s.enemies.forEach(e => {
          if (e.hp > 0 && manhattan(e.pos, pos) <= aoeRange) {
            targets.push(e);
          }
        });
        if (targets.length > 0) {
          const result = resolveVerb(item.verb, item.traits, item.power, s.player, targets, s);
          result.messages.forEach(m => s.log.push(addLog(s, m, 'combat')));
          handleDeadEnemies(s);
        } else if (item.verb === 'HEAL' || item.verb === 'BUFF') {
          const result = resolveVerb(item.verb, item.traits, item.power, s.player, [], s);
          result.messages.forEach(m => s.log.push(addLog(s, m, 'combat')));
        } else {
          s.log.push(addLog(s, 'No target there!', 'system'));
          s.player.energy += item.energyCost;
          s.targetMode = null;
          return s;
        }
      }

      // Consumables are removed after use; equipped items stay
      if (item.itemType === 'consumable') {
        s.player.inventory = s.player.inventory.filter(i => i.id !== item.id);
      }

      s.targetMode = null;

      if (s.player.energy <= 0) {
        endTurn(s);
      }

      s.grid = computeFOV(s.grid, s.player.pos, FOV_RADIUS);
      return s;
    }

    case 'MOVE': {
      if (s.targetMode) {
        s.targetMode = null;
        return s;
      }

      const dir = action.direction;
      const delta: Position = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      }[dir];

      const newPos: Position = {
        x: s.player.pos.x + delta.x,
        y: s.player.pos.y + delta.y,
      };

      if (newPos.x < 0 || newPos.x >= s.width || newPos.y < 0 || newPos.y >= s.height) return s;

      const targetTile = s.grid[newPos.y][newPos.x];
      if (targetTile.type === 'wall') return s;

      if (targetTile.entity && !targetTile.entity.isPlayer) {
        const enemy = targetTile.entity;
        const weapon = s.player.equippedWeapon;
        const atkPower = weapon ? weapon.power + s.player.attack : s.player.attack;
        const dmg = Math.max(1, atkPower - enemy.defense);
        enemy.hp -= dmg;
        s.player.energy -= 1;
        s.log.push(addLog(s, `You attack ${enemy.name} for ${dmg} damage!`, 'combat'));

        if (enemy.hp <= 0) {
          handleDeadEnemies(s);
        }
      } else {
        s.grid[s.player.pos.y][s.player.pos.x].entity = null;
        s.player.pos = newPos;
        s.grid[newPos.y][newPos.x].entity = s.player;
        s.player.energy -= 1;
        checkItemOnGround(s);
      }

      if (s.player.energy <= 0) {
        endTurn(s);
      }

      s.grid = computeFOV(s.grid, s.player.pos, FOV_RADIUS);
      return s;
    }

    case 'PICK_UP': {
      const tile = s.grid[s.player.pos.y][s.player.pos.x];
      if (tile.item) {
        const item = tile.item;
        const isNewItem = !s.collectedItemIds.has(item.id);
        if (item.itemType === 'weapon') {
          if (s.player.equippedWeapon) {
            s.log.push(addLog(s, `Swapped ${s.player.equippedWeapon.name} for ${item.name}`, 'pickup'));
            tile.item = s.player.equippedWeapon;
          } else {
            s.log.push(addLog(s, `Equipped ${item.name}!`, 'pickup'));
            tile.item = null;
          }
          s.player.equippedWeapon = item;
        } else if (item.itemType === 'armor') {
          if (s.player.equippedArmor) {
            s.log.push(addLog(s, `Swapped ${s.player.equippedArmor.name} for ${item.name}`, 'pickup'));
            tile.item = s.player.equippedArmor;
          } else {
            s.log.push(addLog(s, `Equipped ${item.name}!`, 'pickup'));
            tile.item = null;
          }
          s.player.equippedArmor = item;
        } else {
          if (s.player.inventory.length >= s.player.inventorySize) {
            s.log.push(addLog(s, 'Inventory is full!', 'system'));
            return s;
          }
          s.player.inventory.push(item);
          s.log.push(addLog(s, `Picked up ${item.name}!`, 'pickup'));
          tile.item = null;
        }
        if (isNewItem) {
          s.collectedItemIds.add(item.id);
          grantXp(s, 3, 'item found');
        }
      } else {
        s.log.push(addLog(s, 'Nothing to pick up here.', 'system'));
      }
      return s;
    }

    case 'DESCEND': {
      const tile = s.grid[s.player.pos.y][s.player.pos.x];
      if (tile.type === 'stairs') {
        const newFloor = s.floor + 1;
        const { grid, playerStart, enemies } = generateDungeon(MAP_WIDTH, MAP_HEIGHT, newFloor);
        s.grid = grid;
        s.enemies = enemies;
        s.floor = newFloor;
        s.player.pos = playerStart;
        s.player.energy = s.player.maxEnergy;
        s.grid[playerStart.y][playerStart.x].entity = s.player;
        s.grid = computeFOV(s.grid, playerStart, FOV_RADIUS);
        s.log.push(addLog(s, `You descend to floor ${newFloor}...`, 'system'));
        recordFloorReached(newFloor);
        grantXp(s, 10 + newFloor * 2, 'new floor');
      }
      return s;
    }

    case 'PASS_TURN': {
      s.targetMode = null;
      endTurn(s);
      s.grid = computeFOV(s.grid, s.player.pos, FOV_RADIUS);
      return s;
    }

    case 'USE_ITEM': {
      // Check equipped slots first, then inventory
      let item: Item | undefined;
      let source: 'weapon' | 'armor' | 'inventory' = 'inventory';
      if (s.player.equippedWeapon?.id === action.itemId) {
        item = s.player.equippedWeapon;
        source = 'weapon';
      } else if (s.player.equippedArmor?.id === action.itemId) {
        item = s.player.equippedArmor;
        source = 'armor';
      } else {
        item = s.player.inventory.find(i => i.id === action.itemId);
      }
      if (!item) return s;

      if (s.player.energy < item.energyCost) {
        s.log.push(addLog(s, 'Not enough energy!', 'system'));
        return s;
      }

      if (item.verb === 'HEAL' || item.verb === 'BUFF') {
        s.player.energy -= item.energyCost;
        const result = resolveVerb(item.verb, item.traits, item.power, s.player, [], s);
        result.messages.forEach(m => s.log.push(addLog(s, m, 'combat')));
        if (item.itemType === 'consumable') {
          s.player.inventory = s.player.inventory.filter(i => i.id !== item!.id);
        }
        if (s.player.energy <= 0) endTurn(s);
        return s;
      }

      s.targetMode = { item, range: item.range };
      s.log.push(addLog(s, `Select a target for ${item.name} (range: ${item.range})`, 'system'));
      return s;
    }

    default:
      return s;
  }
}

function handleDeadEnemies(s: GameState): void {
  s.enemies = s.enemies.filter(e => {
    if (e.hp <= 0) {
      s.grid[e.pos.y][e.pos.x].entity = null;
      const xpGain = 5 + e.level * 3;
      grantXp(s, xpGain, `${e.name} defeated`);
      return false;
    }
    return true;
  });
}

function endTurn(s: GameState): void {
  s.turn++;
  processEnemyTurns(s);
  s.player.energy = s.player.maxEnergy;
}
