import { Item } from './types';

export interface CharacterDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  hp: number;
  mana: number;
  attack: number;
  defense: number;
  luck: number;
  agility: number;
  inventorySize: number;
  startWeapon: Omit<Item, 'id'>;
  startArmor: Omit<Item, 'id'> | null;
  startItems: Omit<Item, 'id'>[];
  unlockRequirement: { type: 'floor'; floor: number } | null;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    icon: 'Sword',
    description: 'Balanced fighter with solid stats.',
    hp: 30,
    mana: 3,
    attack: 5,
    defense: 2,
    luck: 1,
    agility: 1,
    inventorySize: 4,
    startWeapon: { name: 'Rusty Sword', itemType: 'weapon', rarity: 'common', verb: 'HIT', traits: [], manaCost: 0, power: 5, range: 1, description: 'A basic melee attack' },
    startArmor: null,
    startItems: [],
    unlockRequirement: null,
  },
  {
    id: 'rogue',
    name: 'Rogue',
    icon: 'Zap',
    description: 'Fast and evasive. High dodge, low HP.',
    hp: 18,
    mana: 4,
    attack: 4,
    defense: 0,
    luck: 3,
    agility: 5,
    inventorySize: 5,
    startWeapon: { name: 'Poison Dagger', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: ['POISON', 'PIERCING'], manaCost: 0, power: 4, range: 1, description: 'Venomous strike that ignores armor' },
    startArmor: null,
    startItems: [],
    unlockRequirement: null,
  },
  {
    id: 'mage',
    name: 'Mage',
    icon: 'Flame',
    description: 'Fragile but wields powerful ranged magic.',
    hp: 16,
    mana: 8,
    attack: 3,
    defense: 0,
    luck: 4,
    agility: 1,
    inventorySize: 5,
    startWeapon: { name: 'Apprentice Staff', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: ['FIRE'], manaCost: 2, power: 7, range: 3, description: 'A staff crackling with fire magic' },
    startArmor: null,
    startItems: [
      { name: 'Fire Scroll', itemType: 'consumable', rarity: 'uncommon', verb: 'HIT', traits: ['FIRE', 'AOE'], manaCost: 3, power: 10, range: 3, description: 'Launches a fiery blast hitting nearby enemies' },
    ],
    unlockRequirement: null,
  },
  {
    id: 'paladin',
    name: 'Paladin',
    icon: 'Shield',
    description: 'Holy knight. High defense and self-healing.',
    hp: 35,
    mana: 5,
    attack: 4,
    defense: 4,
    luck: 1,
    agility: 0,
    inventorySize: 3,
    startWeapon: { name: 'Blessed Mace', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: [], manaCost: 0, power: 5, range: 1, description: 'A mace imbued with holy light' },
    startArmor: { name: 'Holy Shield', itemType: 'armor', rarity: 'rare', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'A blessed shield. +3 DEF', defenseBonus: 3 },
    startItems: [
      { name: 'Healing Potion', itemType: 'consumable', rarity: 'common', verb: 'HEAL', traits: [], manaCost: 1, power: 10, range: 0, description: 'Restores a small amount of health' },
    ],
    unlockRequirement: { type: 'floor', floor: 3 },
  },
  {
    id: 'vampire',
    name: 'Vampire',
    icon: 'Ghost',
    description: 'Drains life from foes. No armor, must feed.',
    hp: 20,
    mana: 3,
    attack: 6,
    defense: 0,
    luck: 2,
    agility: 3,
    inventorySize: 4,
    startWeapon: { name: 'Vampiric Claws', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['LIFESTEAL'], manaCost: 0, power: 6, range: 1, description: 'Claws that drain life from the target' },
    startArmor: null,
    startItems: [],
    unlockRequirement: { type: 'floor', floor: 5 },
  },
  {
    id: 'berserker',
    name: 'Berserker',
    icon: 'Skull',
    description: 'Glass cannon. Massive attack, paper-thin defense.',
    hp: 22,
    mana: 2,
    attack: 8,
    defense: 0,
    luck: 3,
    agility: 0,
    inventorySize: 3,
    startWeapon: { name: 'Great Axe', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['AOE'], manaCost: 0, power: 10, range: 1, description: 'A massive axe that cleaves nearby foes' },
    startArmor: null,
    startItems: [
      { name: 'War Cry Scroll', itemType: 'consumable', rarity: 'uncommon', verb: 'BUFF', traits: [], manaCost: 2, power: 3, range: 0, description: 'Temporarily boosts attack by 3' },
    ],
    unlockRequirement: { type: 'floor', floor: 7 },
  },
];

const UNLOCK_KEY = 'dungeon_max_floor';

export function getMaxFloorReached(): number {
  try {
    return parseInt(localStorage.getItem(UNLOCK_KEY) || '1', 10);
  } catch {
    return 1;
  }
}

export function recordFloorReached(floor: number): void {
  const current = getMaxFloorReached();
  if (floor > current) {
    localStorage.setItem(UNLOCK_KEY, String(floor));
  }
}

export function isCharacterUnlocked(char: CharacterDef): boolean {
  if (!char.unlockRequirement) return true;
  return getMaxFloorReached() >= char.unlockRequirement.floor;
}
