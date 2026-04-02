import { GameState, GameAction, Entity, Position, LogEntry, Trait, Item, Verb, LevelUpStat, Direction, GameEvent, StatusEffect } from './types';
import { RARITY_LABEL } from './items';

const FINAL_FLOOR = 10;
import { generateDungeon, computeFOV, resetIdCounters } from './dungeon';
import { CHARACTERS, CharacterDef, recordFloorReached } from './characters';

function getMapSize(floor: number) {
  const w = Math.min(20 + floor * 4, 60);
  const h = Math.min(15 + floor * 3, 45);
  return { width: w, height: h };
}
const FOV_RADIUS = 7;

const DIRECTION_DELTAS: Record<Direction, Position> = {
  'up':         { x: 0,  y: -1 },
  'down':       { x: 0,  y: 1 },
  'left':       { x: -1, y: 0 },
  'right':      { x: 1,  y: 0 },
  'up-left':    { x: -1, y: -1 },
  'up-right':   { x: 1,  y: -1 },
  'down-left':  { x: -1, y: 1 },
  'down-right': { x: 1,  y: 1 },
};

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
  const player = { ...state.player, inventory: [...state.player.inventory], statusEffects: [...state.player.statusEffects] };
  const enemies = state.enemies.map(e => ({ ...e, inventory: [...e.inventory], statusEffects: [...e.statusEffects] }));

  // Build a lookup so grid tiles reference the NEW cloned entity objects
  const entityMap = new Map<string, Entity>();
  entityMap.set(player.id, player);
  enemies.forEach(e => entityMap.set(e.id, e));

  const grid = state.grid.map(row => row.map(tile => {
    const cloned = { ...tile };
    if (cloned.entity) {
      cloned.entity = entityMap.get(cloned.entity.id) ?? cloned.entity;
    }
    return cloned;
  }));

  return { ...state, player, grid, log: [...state.log], enemies, collectedItemIds: new Set(state.collectedItemIds), events: [] };
}

function emit(s: GameState, event: GameEvent): void {
  s.events.push(event);
}

function checkItemOnGround(s: GameState): void {
  const tile = s.grid[s.player.pos.y][s.player.pos.x];
  if (tile.item) {
    const rl = RARITY_LABEL[tile.item.rarity];
    s.log.push(addLog(s, `You see a [${rl}] ${tile.item.name} on the ground here.`, 'info'));
  }
}

// === STATUS EFFECTS ===

function addStatusEffect(entity: Entity, effect: StatusEffect): void {
  const existing = entity.statusEffects.find(e => e.type === effect.type);
  if (existing) {
    // Refresh duration and use stronger power
    existing.turnsLeft = Math.max(existing.turnsLeft, effect.turnsLeft);
    existing.power = Math.max(existing.power, effect.power);
  } else {
    entity.statusEffects.push({ ...effect });
  }
}

function hasEffect(entity: Entity, type: StatusEffect['type']): boolean {
  return entity.statusEffects.some(e => e.type === type);
}

function processStatusEffects(entity: Entity, state: GameState): { skipTurn: boolean } {
  let skipTurn = false;
  const expiredEffects: string[] = [];

  entity.statusEffects = entity.statusEffects.filter(effect => {
    effect.turnsLeft--;

    switch (effect.type) {
      case 'poison': {
        const dmg = effect.power;
        entity.hp -= dmg;
        state.log.push(addLog(state, `☠ ${entity.name} takes ${dmg} poison damage!`, 'damage'));
        emit(state, { type: entity.isPlayer ? 'player_hit' : 'player_attack', pos: { ...entity.pos }, amount: dmg });
        break;
      }
      case 'burning': {
        const dmg = effect.power;
        entity.hp -= dmg;
        state.log.push(addLog(state, `🔥 ${entity.name} takes ${dmg} burn damage!`, 'damage'));
        emit(state, { type: entity.isPlayer ? 'player_hit' : 'player_attack', pos: { ...entity.pos }, amount: dmg });
        break;
      }
      case 'regen': {
        const heal = effect.power;
        entity.hp = Math.min(entity.maxHp, entity.hp + heal);
        state.log.push(addLog(state, `💚 ${entity.name} regenerates ${heal} HP`, 'combat'));
        if (entity.isPlayer) emit(state, { type: 'heal', pos: { ...entity.pos }, amount: heal });
        break;
      }
      case 'frozen': {
        skipTurn = true;
        state.log.push(addLog(state, `❄ ${entity.name} is frozen and cannot act!`, 'system'));
        break;
      }
      case 'stunned': {
        skipTurn = true;
        state.log.push(addLog(state, `⚡ ${entity.name} is stunned!`, 'system'));
        break;
      }
      case 'fear': {
        skipTurn = true; // fear causes flee behavior handled separately for enemies
        if (!entity.isPlayer) {
          state.log.push(addLog(state, `😱 ${entity.name} is terrified and flees!`, 'system'));
        }
        break;
      }
    }

    if (effect.turnsLeft <= 0) {
      expiredEffects.push(effect.type);
      return false;
    }
    return true;
  });

  // Check if entity died from DOT
  if (entity.hp <= 0 && !entity.isPlayer) {
    emit(state, { type: 'enemy_killed', pos: { ...entity.pos }, entityId: entity.id });
  }

  return { skipTurn };
}

function fleeBehavior(state: GameState, enemy: Entity): void {
  const player = state.player;
  const dx = Math.sign(enemy.pos.x - player.pos.x);
  const dy = Math.sign(enemy.pos.y - player.pos.y);
  const moves: Position[] = [
    { x: enemy.pos.x + dx, y: enemy.pos.y + dy },
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

// === COMBAT HELPERS ===

function rollEvade(defender: Entity): boolean {
  if (hasEffect(defender, 'frozen') || hasEffect(defender, 'stunned')) return false;
  const chance = Math.min(defender.agility * 3, 50);
  return Math.random() * 100 < chance;
}

function rollCritical(attacker: Entity): boolean {
  const chance = Math.min(attacker.luck * 2, 40);
  return Math.random() * 100 < chance;
}

function getPlayerDefense(player: Entity): number {
  return player.defense + (player.equippedArmor?.defenseBonus ?? 0);
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
        if (rollEvade(t)) {
          messages.push(`${t.name} evades the attack!`);
          return;
        }
        const isCrit = rollCritical(user);
        let finalDmg = damage;
        if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);
        const def = traits.includes('PIERCING') ? 0 : t.defense;
        finalDmg = Math.max(1, finalDmg - def);
        t.hp -= finalDmg;
        messages.push(`${user.name} hits ${t.name} for ${finalDmg} damage${isCrit ? ' (CRIT!)' : ''}`);
        if (traits.includes('LIFESTEAL')) {
          const heal = Math.floor(finalDmg * 0.3);
          user.hp = Math.min(user.maxHp, user.hp + heal);
          messages.push(`${user.name} drains ${heal} HP`);
        }
        // Apply status effects from traits
        if (traits.includes('POISON')) {
          addStatusEffect(t, { type: 'poison', turnsLeft: 4, power: Math.max(2, Math.floor(power * 0.3)), sourceId: user.id });
          messages.push(`${t.name} is poisoned!`);
        }
        if (traits.includes('FIRE')) {
          addStatusEffect(t, { type: 'burning', turnsLeft: 3, power: Math.max(2, Math.floor(power * 0.25)), sourceId: user.id });
          messages.push(`${t.name} is set ablaze!`);
        }
        if (traits.includes('ICE')) {
          addStatusEffect(t, { type: 'frozen', turnsLeft: 2, power: 0, sourceId: user.id });
          messages.push(`${t.name} is frozen solid!`);
        }
        if (traits.includes('STUN')) {
          addStatusEffect(t, { type: 'stunned', turnsLeft: 2, power: 0, sourceId: user.id });
          messages.push(`${t.name} is stunned!`);
        }
      });
      break;
    }
    case 'HEAL':
      healed = power;
      healed += Math.floor(user.luck * 0.5);
      user.hp = Math.min(user.maxHp, user.hp + healed);
      messages.push(`${user.name} heals for ${healed} HP`);
      break;
    case 'BUFF':
      user.strength += power;
      messages.push(`${user.name}'s strength increased by ${power}!`);
      break;
    case 'TELEPORT':
      messages.push(`${user.name} teleports!`);
      break;
    case 'DEBUFF':
      targets.forEach(t => {
        t.strength = Math.max(0, t.strength - power);
        messages.push(`${t.name}'s strength reduced by ${power}`);
      });
      break;
  }

  return { damage, healed, messages };
}

// === ENEMY AI ===

function hasLineOfSightEngine(grid: import('./types').Tile[][], from: Position, to: Position, width: number, height: number): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let err = dx - dy;
  let { x, y } = from;
  while (x !== to.x || y !== to.y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    if (grid[y][x].type === 'wall' && !(x === from.x && y === from.y)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}

function enemyRangedAttack(state: GameState, enemy: Entity): boolean {
  const player = state.player;
  const dist = manhattan(enemy.pos, player.pos);
  if (enemy.rangeAttack <= 0 || dist > enemy.rangeAttack || dist <= 1) return false;
  if (!hasLineOfSightEngine(state.grid, enemy.pos, player.pos, state.width, state.height)) return false;

  // Ranged attack
  if (rollEvade(player)) {
    state.log.push(addLog(state, `You evade ${enemy.name}'s ranged attack!`, 'combat'));
    emit(state, { type: 'player_evade', pos: { ...player.pos } });
    return true;
  }
  const isCrit = rollCritical(enemy);
  let dmg = enemy.strength;
  if (isCrit) dmg = Math.floor(dmg * 1.5);
  dmg = Math.max(1, dmg - getPlayerDefense(player));
  player.hp -= dmg;
  state.log.push(addLog(state, `${enemy.name} shoots you for ${dmg} damage!${isCrit ? ' (CRIT!)' : ''}`, 'damage'));
  emit(state, { type: 'ranged_attack', fromPos: { ...enemy.pos }, toPos: { ...player.pos } });
  emit(state, { type: 'player_hit', pos: { ...player.pos }, amount: dmg });
  if (isCrit) emit(state, { type: 'crit', pos: { ...player.pos } });
  if (player.hp <= 0) {
    state.gameOver = true;
    state.log.push(addLog(state, 'You have been slain...', 'system'));
    emit(state, { type: 'game_over' });
  }
  return true;
}

function doSingleMove(state: GameState, enemy: Entity): boolean {
  const player = state.player;
  const dist = manhattan(enemy.pos, player.pos);

  // Melee attack if adjacent
  if (dist <= 1) {
    if (rollEvade(player)) {
      state.log.push(addLog(state, `You evade ${enemy.name}'s attack!`, 'combat'));
      emit(state, { type: 'player_evade', pos: { ...player.pos } });
      return true; // used action
    }
    const isCrit = rollCritical(enemy);
    let dmg = enemy.strength;
    if (isCrit) dmg = Math.floor(dmg * 1.5);
    dmg = Math.max(1, dmg - getPlayerDefense(player));
    player.hp -= dmg;
    state.log.push(addLog(state, `${enemy.name} attacks you for ${dmg} damage!${isCrit ? ' (CRIT!)' : ''}`, 'damage'));
    emit(state, { type: 'player_hit', pos: { ...player.pos }, amount: dmg });
    if (isCrit) emit(state, { type: 'crit', pos: { ...player.pos } });
    if (player.hp <= 0) {
      state.gameOver = true;
      state.log.push(addLog(state, 'You have been slain...', 'system'));
      emit(state, { type: 'game_over' });
    }
    return true;
  }

  if (dist > FOV_RADIUS + 2) return false;

  const dx = Math.sign(player.pos.x - enemy.pos.x);
  const dy = Math.sign(player.pos.y - enemy.pos.y);
  const moves: Position[] = [
    { x: enemy.pos.x + dx, y: enemy.pos.y + dy },
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
    return true;
  }
  return false;
}

function moveEnemyTowardPlayer(state: GameState, enemy: Entity): void {
  // Try ranged attack first
  if (enemyRangedAttack(state, enemy)) return;

  // Speed determines number of moves/actions per turn
  const moves = enemy.speed || 1;
  for (let i = 0; i < moves; i++) {
    if (state.gameOver) return;
    const acted = doSingleMove(state, enemy);
    // If enemy attacked (melee), stop — only one attack per turn
    if (acted && manhattan(enemy.pos, state.player.pos) <= 1 && i < moves - 1) break;
    if (!acted) break;
  }
}

function processEnemyTurns(state: GameState): void {
  state.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;

    const { skipTurn } = processStatusEffects(enemy, state);
    if (enemy.hp <= 0) return;

    if (skipTurn) {
      if (hasEffect(enemy, 'fear')) {
        fleeBehavior(state, enemy);
      }
      return;
    }

    moveEnemyTowardPlayer(state, enemy);
  });

  handleDeadEnemies(state);
}

// === XP & LEVELING ===

function checkLevelUp(s: GameState): void {
  if (s.player.xp >= s.player.xpToNext) {
    s.player.level++;
    s.player.xp -= s.player.xpToNext;
    s.player.xpToNext = Math.floor(s.player.xpToNext * 1.5);
    s.player.hp = s.player.maxHp;
    s.pendingLevelUp = true;
    emit(s, { type: 'level_up', pos: { ...s.player.pos } });
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
    case 'mana':
      s.player.maxMana += 2;
      s.player.mana = Math.min(s.player.mana + 2, s.player.maxMana);
      s.log.push(addLog(s, 'Max Mana increased by 2!', 'system'));
      break;
    case 'attack':
      s.player.strength += 2;
      s.log.push(addLog(s, 'Strength increased by 2!', 'system'));
      break;
    case 'defense':
      s.player.defense += 1;
      s.log.push(addLog(s, 'Defense increased by 1!', 'system'));
      break;
    case 'inventory':
      s.player.inventorySize += 1;
      s.log.push(addLog(s, 'Inventory size increased by 1!', 'system'));
      break;
    case 'luck':
      s.player.luck += 2;
      s.log.push(addLog(s, 'Luck increased by 2!', 'system'));
      break;
    case 'agility':
      s.player.agility += 2;
      s.log.push(addLog(s, 'Agility increased by 2!', 'system'));
      break;
  }
  s.pendingLevelUp = false;
}

function grantXp(s: GameState, amount: number, reason: string): void {
  const bonus = Math.floor(s.player.luck * 0.5);
  const total = amount + bonus;
  s.player.xp += total;
  s.log.push(addLog(s, `+${total} XP (${reason})${bonus > 0 ? ` [+${bonus} luck bonus]` : ''}`, 'info'));
  checkLevelUp(s);
}

// === INITIAL STATE ===

export function createInitialState(characterId: string = 'warrior'): GameState {
  resetIdCounters();
  const charDef = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
  const { width: mapW, height: mapH } = getMapSize(1);
  const { grid, playerStart, enemies } = generateDungeon(mapW, mapH, 1);

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
    mana: charDef.mana,
    maxMana: charDef.mana,
    strength: charDef.strength,
    defense: charDef.defense,
    luck: charDef.luck,
    agility: charDef.agility,
    level: 1,
    xp: 0,
    xpToNext: 20,
    equippedWeapon: startWeapon,
    equippedArmor: startArmor,
    inventory: startItems,
    inventorySize: charDef.inventorySize,
    isPlayer: true,
    icon: charDef.icon,
    statusEffects: [],
    speed: 1,
    rangeAttack: 0,
  };

  grid[playerStart.y][playerStart.x].entity = player;
  const fovGrid = computeFOV(grid, playerStart, FOV_RADIUS);

  const state: GameState = {
    grid: fovGrid,
    width: mapW,
    height: mapH,
    player,
    enemies,
    turn: 1,
    log: [],
    logIdCounter: 0,
    gameOver: false,
    victory: false,
    floor: 1,
    targetMode: null,
    pendingLevelUp: false,
    collectedItemIds: new Set(),
    characterId,
    events: [],
  };

  state.log.push(addLog(state, `${charDef.name} descends into the dungeon...`, 'system'));
  state.log.push(addLog(state, 'Move: WASD/Arrows/Numpad (diagonals: QE/ZC or Numpad 7/9/1/3). Space: wait. G: pick up.', 'system'));

  return state;
}

// === TURN MANAGEMENT ===
// You-go-I-go: every player action ends the turn, then enemies act.
// Mana regenerates 1 per turn.

function endTurn(s: GameState): void {
  s.turn++;

  // Process player status effects at start of their "next" turn
  const { skipTurn: playerSkip } = processStatusEffects(s.player, s);
  if (s.player.hp <= 0) {
    s.gameOver = true;
    s.log.push(addLog(s, 'You have been slain...', 'system'));
    emit(s, { type: 'game_over' });
    return;
  }

  processEnemyTurns(s);
  // Regenerate 1 mana per turn
  s.player.mana = Math.min(s.player.maxMana, s.player.mana + 1);
}

// === REDUCER ===

export function gameReducer(state: GameState, action: GameAction): GameState {
  if ((state.gameOver || state.victory) && action.type !== 'NEW_GAME') return state;
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

      if (item.manaCost > 0 && s.player.mana < item.manaCost) {
        s.log.push(addLog(s, 'Not enough mana!', 'system'));
        emit(s, { type: 'no_mana' });
        return s;
      }

      s.player.mana -= item.manaCost;

      // Emit ranged attack event for visual feedback
      emit(s, { type: 'ranged_attack', fromPos: { ...s.player.pos }, toPos: { ...pos }, traits: [...item.traits] });

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
          targets.forEach(t => {
            if (t.hp > 0 || t.hp <= 0) {
              emit(s, { type: 'player_attack', pos: { ...t.pos }, amount: result.damage, entityId: t.id });
            }
          });
          handleDeadEnemies(s);
        } else if (item.verb === 'HEAL' || item.verb === 'BUFF') {
          const result = resolveVerb(item.verb, item.traits, item.power, s.player, [], s);
          result.messages.forEach(m => s.log.push(addLog(s, m, 'combat')));
        } else {
          s.log.push(addLog(s, 'No target there!', 'system'));
          s.player.mana += item.manaCost;
          s.targetMode = null;
          return s;
        }
      }

      if (item.itemType === 'consumable') {
        s.player.inventory = s.player.inventory.filter(i => i.id !== item.id);
      }

      s.targetMode = null;
      endTurn(s);
      s.grid = computeFOV(s.grid, s.player.pos, FOV_RADIUS);
      return s;
    }

    case 'MOVE': {
      if (s.targetMode) {
        s.targetMode = null;
        return s;
      }

      const dir = action.direction;
      const delta = DIRECTION_DELTAS[dir];

      const newPos: Position = {
        x: s.player.pos.x + delta.x,
        y: s.player.pos.y + delta.y,
      };

      if (newPos.x < 0 || newPos.x >= s.width || newPos.y < 0 || newPos.y >= s.height) return s;

      const targetTile = s.grid[newPos.y][newPos.x];
      if (targetTile.type === 'wall') return s;

      if (targetTile.entity && !targetTile.entity.isPlayer) {
        const enemy = targetTile.entity;
        if (rollEvade(enemy)) {
          s.log.push(addLog(s, `${enemy.name} dodges your attack!`, 'combat'));
          emit(s, { type: 'enemy_evade', pos: { ...enemy.pos } });
        } else {
          const weapon = s.player.equippedWeapon;
          // Magic weapons (manaCost > 0) do reduced melee damage — full power requires using the ability
          const weaponBonus = weapon ? (weapon.manaCost > 0 ? Math.floor(weapon.power * 0.25) : weapon.power) : 0;
          const atkPower = weaponBonus + s.player.strength;
          const isCrit = rollCritical(s.player);
          let dmg = atkPower;
          if (isCrit) dmg = Math.floor(dmg * 1.5);
          dmg = Math.max(1, dmg - enemy.defense);
          enemy.hp -= dmg;
          s.log.push(addLog(s, `You attack ${enemy.name} for ${dmg} damage!${isCrit ? ' (CRIT!)' : ''}`, 'combat'));
          emit(s, { type: 'player_attack', pos: { ...enemy.pos }, amount: dmg, entityId: enemy.id });
          if (isCrit) emit(s, { type: 'crit', pos: { ...enemy.pos } });

          // Apply weapon trait effects on melee hit
          if (weapon) {
            if (weapon.traits.includes('LIFESTEAL')) {
              const heal = Math.floor(dmg * 0.3);
              s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
              s.log.push(addLog(s, `You drain ${heal} HP!`, 'combat'));
              emit(s, { type: 'heal', pos: { ...s.player.pos }, amount: heal });
            }
            if (weapon.traits.includes('POISON') && enemy.hp > 0) {
              addStatusEffect(enemy, { type: 'poison', turnsLeft: 4, power: Math.max(2, Math.floor(weapon.power * 0.3)), sourceId: s.player.id });
              s.log.push(addLog(s, `${enemy.name} is poisoned!`, 'combat'));
            }
            if (weapon.traits.includes('FIRE') && enemy.hp > 0) {
              addStatusEffect(enemy, { type: 'burning', turnsLeft: 3, power: Math.max(2, Math.floor(weapon.power * 0.4)), sourceId: s.player.id });
              s.log.push(addLog(s, `${enemy.name} is burning!`, 'combat'));
            }
            if (weapon.traits.includes('ICE') && enemy.hp > 0) {
              addStatusEffect(enemy, { type: 'frozen', turnsLeft: 2, power: 0, sourceId: s.player.id });
              s.log.push(addLog(s, `${enemy.name} is frozen!`, 'combat'));
            }
            if (weapon.traits.includes('STUN') && enemy.hp > 0) {
              addStatusEffect(enemy, { type: 'stunned', turnsLeft: 1, power: 0, sourceId: s.player.id });
              s.log.push(addLog(s, `${enemy.name} is stunned!`, 'combat'));
            }
          }

          if (enemy.hp <= 0) {
            handleDeadEnemies(s);
          }
        }
      } else {
        s.grid[s.player.pos.y][s.player.pos.x].entity = null;
        s.player.pos = newPos;
        s.grid[newPos.y][newPos.x].entity = s.player;
        checkItemOnGround(s);
      }

      // Every action ends the turn
      endTurn(s);
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
          emit(s, { type: 'pickup', pos: { ...s.player.pos } });
        } else if (item.itemType === 'armor') {
          if (s.player.equippedArmor) {
            s.log.push(addLog(s, `Swapped ${s.player.equippedArmor.name} for ${item.name}`, 'pickup'));
            tile.item = s.player.equippedArmor;
          } else {
            s.log.push(addLog(s, `Equipped ${item.name}!`, 'pickup'));
            tile.item = null;
          }
          s.player.equippedArmor = item;
          emit(s, { type: 'pickup', pos: { ...s.player.pos } });
        } else {
          if (s.player.inventory.length >= s.player.inventorySize) {
            s.log.push(addLog(s, 'Inventory is full!', 'system'));
            return s;
          }
          s.player.inventory.push(item);
          s.log.push(addLog(s, `Picked up ${item.name}!`, 'pickup'));
          emit(s, { type: 'pickup', pos: { ...s.player.pos } });
          tile.item = null;
        }
        if (isNewItem) {
          s.collectedItemIds.add(item.id);
          grantXp(s, 3, 'item found');
        }
      } else {
        s.log.push(addLog(s, 'Nothing to pick up here.', 'system'));
      }
      // Picking up doesn't end the turn (free action)
      return s;
    }

    case 'DESCEND': {
      const tile = s.grid[s.player.pos.y][s.player.pos.x];
      if (tile.type === 'treasure') {
        // Victory!
        s.victory = true;
        s.log.push(addLog(s, '✨ You open the ancient treasure chest and find the legendary Artifact of Verbs!', 'system'));
        s.log.push(addLog(s, '🏆 You have conquered the dungeon! Victory!', 'system'));
        emit(s, { type: 'victory', pos: { ...s.player.pos } });
        return s;
      }
      if (tile.type === 'stairs') {
        const newFloor = s.floor + 1;
        const isFinalFloor = newFloor >= FINAL_FLOOR;
        const { width: newW, height: newH } = getMapSize(newFloor);
        const { grid, playerStart, enemies } = generateDungeon(newW, newH, newFloor, isFinalFloor);
        s.width = newW;
        s.height = newH;
        s.grid = grid;
        s.enemies = enemies;
        s.floor = newFloor;
        s.player.pos = playerStart;
        s.player.mana = s.player.maxMana;
        s.grid[playerStart.y][playerStart.x].entity = s.player;
        s.grid = computeFOV(s.grid, playerStart, FOV_RADIUS);
        s.log.push(addLog(s, `You descend to floor ${newFloor}...${isFinalFloor ? ' Something powerful awaits...' : ''}`, 'system'));
        emit(s, { type: 'descend' });
        recordFloorReached(newFloor);
        grantXp(s, 10 + newFloor * 2, 'new floor');
      }
      return s;
    }

    case 'PASS_TURN': {
      s.targetMode = null;
      s.log.push(addLog(s, 'You wait...', 'info'));
      endTurn(s);
      s.grid = computeFOV(s.grid, s.player.pos, FOV_RADIUS);
      return s;
    }

    case 'USE_ITEM': {
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

      if (item.manaCost > 0 && s.player.mana < item.manaCost) {
        s.log.push(addLog(s, 'Not enough mana!', 'system'));
        emit(s, { type: 'no_mana' });
        return s;
      }

      if (item.verb === 'HEAL' || item.verb === 'BUFF') {
        s.player.mana -= item.manaCost;
        const result = resolveVerb(item.verb, item.traits, item.power, s.player, [], s);
        result.messages.forEach(m => s.log.push(addLog(s, m, 'combat')));
        if (item.itemType === 'consumable') {
          s.player.inventory = s.player.inventory.filter(i => i.id !== item!.id);
        }
        endTurn(s);
        return s;
      }

      s.targetMode = { item, range: item.range };
      s.log.push(addLog(s, `Select a target for ${item.name} (range: ${item.range})`, 'system'));
      return s;
    }

    case 'DROP_ITEM': {
      const tile = s.grid[s.player.pos.y][s.player.pos.x];
      if (tile.item) {
        s.log.push(addLog(s, 'There is already an item here!', 'system'));
        return s;
      }
      const itemIdx = s.player.inventory.findIndex(i => i.id === action.itemId);
      if (itemIdx === -1) return s;
      const [dropped] = s.player.inventory.splice(itemIdx, 1);
      tile.item = dropped;
      s.log.push(addLog(s, `You drop ${dropped.name}.`, 'info'));
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
      emit(s, { type: 'enemy_killed', pos: { ...e.pos }, entityId: e.id });
      const xpGain = 5 + e.level * 3;
      grantXp(s, xpGain, `${e.name} defeated`);
      return false;
    }
    return true;
  });
}
