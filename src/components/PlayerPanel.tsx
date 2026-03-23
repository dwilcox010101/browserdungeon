import React from 'react';
import { Entity, Item } from '@/game/types';
import { Heart, Zap, Shield, Sword, Star, ChevronUp, Package } from 'lucide-react';

interface PlayerPanelProps {
  player: Entity;
  floor: number;
  turn: number;
  targetMode: boolean;
  onUseItem: (itemId: string) => void;
  onCancelTarget: () => void;
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

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player, floor, turn, targetMode, onUseItem, onCancelTarget
}) => {
  return (
    <div className="w-64 bg-card border-l border-border p-4 flex flex-col h-full overflow-y-auto">
      <h2 className="text-primary font-bold text-sm tracking-wider uppercase mb-4">
        {player.name}
      </h2>

      <StatBar
        label="HP"
        current={player.hp}
        max={player.maxHp}
        icon={<Heart size={12} />}
        colorClass="bg-game-health"
      />
      <StatBar
        label="Energy"
        current={player.energy}
        max={player.maxEnergy}
        icon={<Zap size={12} />}
        colorClass="bg-game-energy"
      />

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-secondary rounded p-2 flex items-center gap-1">
          <Sword size={12} className="text-primary" /> ATK: {player.attack}
        </div>
        <div className="bg-secondary rounded p-2 flex items-center gap-1">
          <Shield size={12} className="text-primary" /> DEF: {player.defense}
        </div>
        <div className="bg-secondary rounded p-2 flex items-center gap-1">
          <Star size={12} className="text-primary" /> LVL: {player.level}
        </div>
        <div className="bg-secondary rounded p-2 flex items-center gap-1">
          <ChevronUp size={12} className="text-primary" /> XP: {player.xp}/{player.xpToNext}
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 flex justify-between">
        <span>Floor {floor}</span>
        <span>Turn {turn}</span>
      </div>

      <div className="border-t border-border pt-3 mt-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Package size={12} /> Inventory
        </h3>
        {targetMode && (
          <button
            onClick={onCancelTarget}
            className="w-full mb-2 text-xs bg-accent/20 text-accent-foreground border border-accent rounded px-2 py-1 hover:bg-accent/30 transition-colors"
          >
            Cancel targeting (ESC)
          </button>
        )}
        <div className="space-y-1">
          {player.inventory.map(item => (
            <button
              key={item.id}
              onClick={() => onUseItem(item.id)}
              className="w-full text-left text-xs bg-secondary hover:bg-secondary/80 rounded p-2 transition-colors group"
              title={item.description}
            >
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">{item.name}</span>
                <span className="text-game-energy text-[10px]">⚡{item.energyCost}</span>
              </div>
              <div className="text-muted-foreground text-[10px] mt-0.5">
                {item.verb} {item.traits.length > 0 && `• ${item.traits.join(', ')}`}
              </div>
            </button>
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
