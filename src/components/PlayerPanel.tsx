import React from "react";
import { Entity, Item, StatusEffect } from "@/game/types";
import { RARITY_COLORS, RARITY_BG, RARITY_BORDER, RARITY_LABEL } from "@/game/items";
import {
  Heart,
  Droplets,
  Shield,
  Sword,
  Star,
  ChevronUp,
  Package,
  Shirt,
  Clover,
  Wind,
  Flame,
  Snowflake,
  Skull,
  Zap,
  Activity,
} from "lucide-react";

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
      <span className="text-foreground font-medium">
        {current}/{max}
      </span>
    </div>
    <div className="w-full h-2 bg-secondary rounded-sm overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-300`}
        style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
      />
    </div>
  </div>
);

const ItemButton: React.FC<{ item: Item; onUse: (id: string) => void; keybind?: string }> = ({
  item,
  onUse,
  keybind,
}) => (
  <button
    onClick={() => onUse(item.id)}
    className={`w-full text-left text-xs ${RARITY_BG[item.rarity]} hover:opacity-80 rounded p-2 transition-colors group border ${RARITY_BORDER[item.rarity]}`}
    title={`[${RARITY_LABEL[item.rarity]}] ${item.description}${keybind ? ` (${keybind})` : ""}`}
  >
    <div className="flex justify-between items-center">
      <span className={`${RARITY_COLORS[item.rarity]} font-medium`}>
        {keybind && <span className="text-muted-foreground font-mono mr-1">[{keybind}]</span>}
        {item.name}
      </span>
      {item.manaCost > 0 && <span className="text-game-energy text-[10px]">💧{item.manaCost}</span>}
    </div>
    <div className="text-muted-foreground text-[10px] mt-0.5">
      <span className={`${RARITY_COLORS[item.rarity]} opacity-70`}>[{RARITY_LABEL[item.rarity]}]</span>{" "}
      {item.description}
      {item.defenseBonus ? ` • +${item.defenseBonus} DEF` : ""}
    </div>
  </button>
);

const STATUS_EFFECT_CONFIG: Record<StatusEffect["type"], { icon: React.ReactNode; label: string; color: string }> = {
  poison: { icon: <Skull size={10} />, label: "Poison", color: "bg-green-900/60 text-green-400 border-green-700" },
  burning: { icon: <Flame size={10} />, label: "Burning", color: "bg-red-900/60 text-red-400 border-red-700" },
  frozen: { icon: <Snowflake size={10} />, label: "Frozen", color: "bg-blue-900/60 text-blue-400 border-blue-700" },
  stunned: { icon: <Zap size={10} />, label: "Stunned", color: "bg-yellow-900/60 text-yellow-400 border-yellow-700" },
  regen: {
    icon: <Activity size={10} />,
    label: "Regen",
    color: "bg-emerald-900/60 text-emerald-400 border-emerald-700",
  },
  fear: { icon: <Skull size={10} />, label: "Fear", color: "bg-purple-900/60 text-purple-400 border-purple-700" },
};

const StatusBadge: React.FC<{ effect: StatusEffect }> = ({ effect }) => {
  const config = STATUS_EFFECT_CONFIG[effect.type];
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${config.color}`}
      title={`${config.label}: ${effect.power > 0 ? `${effect.power}/turn` : "active"} (${effect.turnsLeft} turns left)`}
    >
      {config.icon} {config.label} ({effect.turnsLeft})
    </span>
  );
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  floor,
  turn,
  targetMode,
  onUseItem,
  onCancelTarget,
  inventoryFlash,
}) => {
  const totalDef = player.defense + (player.equippedArmor?.defenseBonus ?? 0);

  return (
    <div className="w-1/4 bg-card border-r border-border p-4 flex flex-col h-full overflow-y-auto shrink-0">
      <h2 className="text-primary font-bold text-sm tracking-wider uppercase mb-4">{player.name}</h2>

      <StatBar
        label="HP"
        current={player.hp}
        max={player.maxHp}
        icon={<Heart size={12} />}
        colorClass="bg-game-health"
      />
      <StatBar
        label="Mana"
        current={player.mana}
        max={player.maxMana}
        icon={<Droplets size={12} />}
        colorClass="bg-game-energy"
      />
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

      {/* Status Effects */}
      {player.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {player.statusEffects.map((eff, idx) => (
            <StatusBadge key={`${eff.type}-${idx}`} effect={eff} />
          ))}
        </div>
      )}

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
          <Sword size={12} /> Weapon <span className="text-muted-foreground font-mono text-[10px] ml-auto">[F]</span>
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
          <div
            className={`w-full text-left text-xs ${RARITY_BG[player.equippedArmor.rarity]} rounded p-2 border ${RARITY_BORDER[player.equippedArmor.rarity]}`}
          >
            <div className="flex justify-between items-center">
              <span className={`${RARITY_COLORS[player.equippedArmor.rarity]} font-medium`}>
                {player.equippedArmor.name}
              </span>
              <span className="text-primary text-[10px]">+{player.equippedArmor.defenseBonus} DEF</span>
            </div>
            <div className="text-muted-foreground text-[10px] mt-0.5">
              <span className={`${RARITY_COLORS[player.equippedArmor.rarity]} opacity-70`}>
                [{RARITY_LABEL[player.equippedArmor.rarity]}]
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs italic mb-1">None</p>
        )}
      </div>

      {/* General Inventory */}
      <div
        className={`border-t border-border pt-3 mt-2 ${inventoryFlash ? "animate-[inventoryPulse_0.4s_ease-out]" : ""}`}
      >
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Package size={12} /> Inventory ({player.inventory.length}/{player.inventorySize})
        </h3>
        <div className="space-y-1">
          {player.inventory.map((item, idx) => (
            <ItemButton
              key={item.id}
              item={item}
              onUse={onUseItem}
              keybind={idx < 10 ? `${(idx + 1) % 10}` : undefined}
            />
          ))}
          {player.inventory.length === 0 && <p className="text-muted-foreground text-xs italic">Empty</p>}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
