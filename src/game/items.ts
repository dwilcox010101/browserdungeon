import { Item, Rarity } from './types';

export type ItemTemplate = Omit<Item, 'id'>;

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

export const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-secondary',
  uncommon: 'bg-green-950/40',
  rare: 'bg-blue-950/40',
  epic: 'bg-purple-950/40',
  legendary: 'bg-yellow-950/40',
};

export const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-border',
  uncommon: 'border-green-700/50',
  rare: 'border-blue-700/50',
  epic: 'border-purple-700/50',
  legendary: 'border-yellow-700/50',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// === ITEM POOL ===

export const ITEM_POOL: ItemTemplate[] = [
  // ─── COMMON CONSUMABLES ───
  { name: 'Healing Potion', itemType: 'consumable', rarity: 'common', verb: 'HEAL', traits: [], manaCost: 1, power: 10, range: 0, description: 'Restores a small amount of health' },
  { name: 'Minor Mana Tonic', itemType: 'consumable', rarity: 'common', verb: 'HEAL', traits: [], manaCost: 0, power: 0, range: 0, description: 'Restores 3 mana (applied on pickup)' },
  { name: 'Throwing Knife', itemType: 'consumable', rarity: 'common', verb: 'HIT', traits: ['PIERCING'], manaCost: 0, power: 5, range: 3, description: 'A simple throwing knife' },
  { name: 'Smoke Bomb', itemType: 'consumable', rarity: 'common', verb: 'DEBUFF', traits: [], manaCost: 1, power: 2, range: 3, description: 'Reduces target attack' },
  { name: 'Bandages', itemType: 'consumable', rarity: 'common', verb: 'HEAL', traits: [], manaCost: 0, power: 6, range: 0, description: 'Patches up minor wounds' },

  // ─── COMMON WEAPONS ───
  { name: 'Rusty Dagger', itemType: 'weapon', rarity: 'common', verb: 'HIT', traits: [], manaCost: 0, power: 3, range: 1, description: 'A dull, rusty dagger' },
  { name: 'Wooden Club', itemType: 'weapon', rarity: 'common', verb: 'HIT', traits: [], manaCost: 0, power: 4, range: 1, description: 'A crude wooden club' },
  { name: 'Short Spear', itemType: 'weapon', rarity: 'common', verb: 'HIT', traits: [], manaCost: 0, power: 5, range: 1, description: 'A basic short spear' },

  // ─── COMMON ARMOR ───
  { name: 'Leather Cap', itemType: 'armor', rarity: 'common', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'A simple leather cap. +1 DEF', defenseBonus: 1 },
  { name: 'Wooden Shield', itemType: 'armor', rarity: 'common', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'A flimsy wooden shield. +1 DEF', defenseBonus: 1 },

  // ─── UNCOMMON CONSUMABLES ───
  { name: 'Fire Scroll', itemType: 'consumable', rarity: 'uncommon', verb: 'HIT', traits: ['FIRE', 'AOE'], manaCost: 3, power: 10, range: 3, description: 'Launches a fiery blast hitting nearby enemies' },
  { name: 'Ice Shard', itemType: 'consumable', rarity: 'uncommon', verb: 'HIT', traits: ['ICE', 'STUN'], manaCost: 3, power: 8, range: 4, description: 'Freezes and stuns a target' },
  { name: 'Greater Healing Potion', itemType: 'consumable', rarity: 'uncommon', verb: 'HEAL', traits: [], manaCost: 2, power: 20, range: 0, description: 'Restores a good amount of health' },
  { name: 'War Cry Scroll', itemType: 'consumable', rarity: 'uncommon', verb: 'BUFF', traits: [], manaCost: 2, power: 3, range: 0, description: 'Temporarily boosts attack by 3' },
  { name: 'Teleport Stone', itemType: 'consumable', rarity: 'uncommon', verb: 'TELEPORT', traits: [], manaCost: 3, power: 0, range: 6, description: 'Teleport to a visible tile' },
  { name: 'Poison Flask', itemType: 'consumable', rarity: 'uncommon', verb: 'HIT', traits: ['POISON'], manaCost: 2, power: 7, range: 3, description: 'Throws a poisonous flask' },

  // ─── UNCOMMON WEAPONS ───
  { name: 'Steel Sword', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: [], manaCost: 0, power: 7, range: 1, description: 'A reliable steel sword' },
  { name: 'Poison Dagger', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: ['POISON', 'PIERCING'], manaCost: 0, power: 5, range: 1, description: 'Venomous strike that ignores armor' },
  { name: 'Hand Axe', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: [], manaCost: 0, power: 8, range: 1, description: 'A sturdy hand axe' },
  { name: 'Longbow', itemType: 'weapon', rarity: 'uncommon', verb: 'HIT', traits: [], manaCost: 0, power: 6, range: 4, description: 'Attack from a safe distance' },

  // ─── UNCOMMON ARMOR ───
  { name: 'Iron Shield', itemType: 'armor', rarity: 'uncommon', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'A sturdy iron shield. +2 DEF', defenseBonus: 2 },
  { name: 'Chainmail', itemType: 'armor', rarity: 'uncommon', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Light chainmail armor. +3 DEF', defenseBonus: 3 },
  { name: 'Studded Leather', itemType: 'armor', rarity: 'uncommon', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Reinforced leather. +2 DEF', defenseBonus: 2 },

  // ─── RARE CONSUMABLES ───
  { name: 'Lightning Bolt Scroll', itemType: 'consumable', rarity: 'rare', verb: 'HIT', traits: ['PIERCING'], manaCost: 4, power: 18, range: 5, description: 'A devastating bolt of lightning' },
  { name: 'Elixir of Life', itemType: 'consumable', rarity: 'rare', verb: 'HEAL', traits: [], manaCost: 3, power: 35, range: 0, description: 'Fully restores health' },
  { name: 'Firestorm Scroll', itemType: 'consumable', rarity: 'rare', verb: 'HIT', traits: ['FIRE', 'AOE'], manaCost: 5, power: 16, range: 3, description: 'Engulfs an area in searing flames' },
  { name: 'Frost Nova Scroll', itemType: 'consumable', rarity: 'rare', verb: 'HIT', traits: ['ICE', 'AOE', 'STUN'], manaCost: 5, power: 12, range: 3, description: 'Freezes all nearby enemies' },
  { name: 'Power Surge Scroll', itemType: 'consumable', rarity: 'rare', verb: 'BUFF', traits: [], manaCost: 4, power: 6, range: 0, description: 'Massively boosts attack by 6' },

  // ─── RARE WEAPONS ───
  { name: 'Vampiric Blade', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['LIFESTEAL'], manaCost: 0, power: 9, range: 1, description: 'Drains life from the target' },
  { name: 'Flaming Sword', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['FIRE'], manaCost: 0, power: 10, range: 1, description: 'A blade wreathed in fire' },
  { name: 'Frost Axe', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['ICE', 'STUN'], manaCost: 0, power: 9, range: 1, description: 'Chills enemies on contact' },
  { name: 'Elven Bow', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['PIERCING'], manaCost: 0, power: 8, range: 5, description: 'An elegant bow that pierces armor' },
  { name: 'Warhammer', itemType: 'weapon', rarity: 'rare', verb: 'HIT', traits: ['KNOCKBACK'], manaCost: 0, power: 12, range: 1, description: 'A massive warhammer' },

  // ─── RARE ARMOR ───
  { name: 'Plate Armor', itemType: 'armor', rarity: 'rare', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Heavy plate armor. +4 DEF', defenseBonus: 4 },
  { name: 'Mithril Vest', itemType: 'armor', rarity: 'rare', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Incredibly light and strong. +5 DEF', defenseBonus: 5 },

  // ─── EPIC CONSUMABLES ───
  { name: 'Meteor Strike Scroll', itemType: 'consumable', rarity: 'epic', verb: 'HIT', traits: ['FIRE', 'AOE', 'PIERCING'], manaCost: 7, power: 25, range: 4, description: 'Calls down a devastating meteor' },
  { name: 'Divine Restoration', itemType: 'consumable', rarity: 'epic', verb: 'HEAL', traits: [], manaCost: 5, power: 50, range: 0, description: 'A miracle of healing. Full HP restore' },
  { name: 'Blizzard Scroll', itemType: 'consumable', rarity: 'epic', verb: 'HIT', traits: ['ICE', 'AOE', 'STUN'], manaCost: 6, power: 20, range: 4, description: 'Unleashes an arctic tempest' },
  { name: 'Soul Rend Scroll', itemType: 'consumable', rarity: 'epic', verb: 'HIT', traits: ['LIFESTEAL', 'PIERCING'], manaCost: 5, power: 22, range: 3, description: 'Tears the soul, draining life' },

  // ─── EPIC WEAPONS ───
  { name: 'Dragonslayer', itemType: 'weapon', rarity: 'epic', verb: 'HIT', traits: ['FIRE', 'PIERCING'], manaCost: 0, power: 14, range: 1, description: 'A legendary dragon-forged blade' },
  { name: 'Shadow Scythe', itemType: 'weapon', rarity: 'epic', verb: 'HIT', traits: ['LIFESTEAL', 'PIERCING'], manaCost: 0, power: 12, range: 1, description: 'Reaps life from those it cuts' },
  { name: 'Thunderstaff', itemType: 'weapon', rarity: 'epic', verb: 'HIT', traits: ['AOE'], manaCost: 2, power: 13, range: 3, description: 'A staff crackling with storm energy' },
  { name: 'Frostbite Bow', itemType: 'weapon', rarity: 'epic', verb: 'HIT', traits: ['ICE', 'STUN'], manaCost: 0, power: 11, range: 5, description: 'Arrows that freeze on impact' },

  // ─── EPIC ARMOR ───
  { name: 'Dragonscale Mail', itemType: 'armor', rarity: 'epic', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Armor of dragon scales. +6 DEF', defenseBonus: 6 },
  { name: 'Shadow Cloak', itemType: 'armor', rarity: 'epic', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Wraps you in shadows. +5 DEF', defenseBonus: 5 },

  // ─── LEGENDARY CONSUMABLES ───
  { name: 'Armageddon Scroll', itemType: 'consumable', rarity: 'legendary', verb: 'HIT', traits: ['FIRE', 'AOE', 'PIERCING'], manaCost: 8, power: 40, range: 5, description: 'Annihilates everything in sight' },
  { name: 'Phoenix Tear', itemType: 'consumable', rarity: 'legendary', verb: 'HEAL', traits: [], manaCost: 0, power: 99, range: 0, description: 'Fully restores HP and mana' },

  // ─── LEGENDARY WEAPONS ───
  { name: 'Excalibur', itemType: 'weapon', rarity: 'legendary', verb: 'HIT', traits: ['PIERCING', 'LIFESTEAL'], manaCost: 0, power: 18, range: 1, description: 'The sword of legends. Unmatched power' },
  { name: 'Staff of the Archmage', itemType: 'weapon', rarity: 'legendary', verb: 'HIT', traits: ['FIRE', 'ICE', 'AOE'], manaCost: 3, power: 16, range: 4, description: 'Commands fire and ice' },
  { name: 'Doom Bow', itemType: 'weapon', rarity: 'legendary', verb: 'HIT', traits: ['PIERCING', 'POISON'], manaCost: 0, power: 15, range: 6, description: 'Each arrow spells certain doom' },

  // ─── LEGENDARY ARMOR ───
  { name: 'Aegis of the Gods', itemType: 'armor', rarity: 'legendary', verb: 'BUFF', traits: [], manaCost: 0, power: 0, range: 0, description: 'Divine protection incarnate. +8 DEF', defenseBonus: 8 },
];

// Rarity weights by floor tier
const RARITY_WEIGHTS: Record<string, Record<Rarity, number>> = {
  early:  { common: 60, uncommon: 30, rare: 8, epic: 2, legendary: 0 },
  mid:    { common: 30, uncommon: 35, rare: 25, epic: 8, legendary: 2 },
  late:   { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 },
};

function getFloorTier(floor: number): string {
  if (floor <= 3) return 'early';
  if (floor <= 7) return 'mid';
  return 'late';
}

export function rollItemForFloor(floor: number): ItemTemplate {
  const tier = getFloorTier(floor);
  const weights = RARITY_WEIGHTS[tier];

  // Weighted random rarity selection
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let selectedRarity: Rarity = 'common';
  for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
    roll -= weight;
    if (roll <= 0) {
      selectedRarity = rarity;
      break;
    }
  }

  const candidates = ITEM_POOL.filter(i => i.rarity === selectedRarity);
  if (candidates.length === 0) {
    // Fallback to common
    const commons = ITEM_POOL.filter(i => i.rarity === 'common');
    return commons[Math.floor(Math.random() * commons.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
