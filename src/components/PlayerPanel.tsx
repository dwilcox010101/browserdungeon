import React from 'react';
import { Entity, Item } from '@/game/types';
import { Heart, Zap, Shield, Sword, Star, ChevronUp, Package, Shirt, Clover, Wind } from 'lucide-react';

interface PlayerPanelProps {
  player: Entity;
  floor: number;
  turn: number;
  targetMode: boolean;
  onUseItem: (itemId: string) => void;
  onCancelTarget: () => void;
  inventoryFlash?: boolean;
}

const StatBar: React.FC<{
  label: string;
  current: number;
  max: number;
  icon: React.ReactNode;
  colorClass: string;
}> = ({ label, current, max, icon, colorClass }) => (
  <div className="mb-3">
    <div className="flex items-center justify-between text-xs mb-1">
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-foreground font-medium">{current}/{max}</span>
    </div>
    <div className="w-full h-2 bg-secondary rounded-sm overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-300`}
        style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
      />
    </div>
  </div>
);

const ItemButton: React.FC<{ item: Item; onUse: (id: string) => void }> = ({ item, onUse }) => (
  <button
    onClick={() => onUse(item.id)}
    className="w-full text-left text-xs bg-secondary hover:bg-secondary/80 rounded p-2 transition-colors group"
    title={item.description}
  >
    <div className="flex justify-between items-center">
      <span className="text-foreground font-medium">{item.name}</span>
      {item.energyCost > 0 && (
        <span className="text-game-energy text-[10px]">⚡{item.energyCost}</span>
      )}
    </div>
    <div className="text-muted-foreground text-[10px] mt-0.5">
      {item.description}
      {item.defenseBonus ? ` • +${item.defenseBonus} DEF` : ''}
    </div>
  </button>
);

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player, floor, turn, targetMode, onUseItem, onCancelTarget, inventoryFlash
}) => {
  const totalDef = player.defense + (player.equippedArmor?.defenseBonus ?? 0);

  return (
    <div className="w-64 bg-card border-r border-border p-4 flex flex-col h-full overflow-y-auto shrink-0">
      <h2 className="text-primary font-bold text-sm tracking-wider uppercase mb-4">
        {player.name}
      </h2>

      <StatBar label="HP" current={player.hp} max={player.maxHp} icon={<Heart size={12} />} colorClass="bg-game-health" />
      <StatBar label="Energy" current={player.energy} max={player.maxEnergy} icon={<Zap size={12} />} colorClass="bg-game-energy" />
      <StatBar label="XP" current={player.xp} max={player.xpToNext} icon={<Star size={12} />} colorClass="bg-primary" />

      <div className="grid grid-cols-3 gap-1.5 mb-4 text-xs">
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Attack power">
          <Sword size={10} className="text-primary" /> ATK: {player.attack}
        </div>
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Defense (reduces damage taken)">
          <Shield size={10} className="text-primary" /> DEF: {totalDef}
        </div>
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Level">
          <Star size={10} className="text-primary" /> LVL: {player.level}
        </div>
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Luck (crit chance & bonus XP)">
          <Clover size={10} className="text-primary" /> LCK: {player.luck}
        </div>
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Dodge (chance to avoid attacks)">
          <Wind size={10} className="text-primary" /> DDG: {player.dodge}
        </div>
        <div className="bg-secondary rounded p-1.5 flex items-center gap-1" title="Current floor">
          <ChevronUp size={10} className="text-primary" /> FLR: {floor}
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 flex justify-between">
        <span>Turn {turn}</span>
      </div>

      {targetMode && (
        <button
          onClick={onCancelTarget}
          className="w-full mb-2 text-xs bg-accent/20 text-accent-foreground border border-accent rounded px-2 py-1 hover:bg-accent/30 transition-colors"
        >
          Cancel targeting (ESC)
        </button>
      )}

      {/* Equipment Slots */}
      <div className="border-t border-border pt-3 mt-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Sword size={12} /> Weapon
        </h3>
        {player.equippedWeapon ? (
          <ItemButton item={player.equippedWeapon} onUse={onUseItem} />
        ) : (
          <p className="text-muted-foreground text-xs italic mb-1">None</p>
        )}
      </div>

      <div className="border-t border-border pt-3 mt-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Shirt size={12} /> Armor
        </h3>
        {player.equippedArmor ? (
          <div className="w-full text-left text-xs bg-secondary rounded p-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">{player.equippedArmor.name}</span>
              <span className="text-primary text-[10px]">+{player.equippedArmor.defenseBonus} DEF</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs italic mb-1">None</p>
        )}
      </div>

      {/* General Inventory */}
      <div className={`border-t border-border pt-3 mt-2 ${inventoryFlash ? 'animate-[inventoryPulse_0.4s_ease-out]' : ''}`}>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Package size={12} /> Inventory ({player.inventory.length}/{player.inventorySize})
        </h3>
        <div className="space-y-1">
          {player.inventory.map(item => (
            <ItemButton key={item.id} item={item} onUse={onUseItem} />
          ))}
          {player.inventory.length === 0 && (
            <p className="text-muted-foreground text-xs italic">Empty</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
