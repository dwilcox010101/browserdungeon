import React, { useState, useEffect, useCallback } from "react";
import { LevelUpStat, Entity } from "@/game/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, Droplets, Sword, Shield, Package, Clover, Wind } from "lucide-react";

interface LevelUpDialogProps {
  open: boolean;
  player: Entity;
  onChoose: (stat: LevelUpStat) => void;
}

const STAT_OPTIONS: {
  stat: LevelUpStat;
  label: string;
  icon: React.ElementType;
  description: string;
  bonus: string;
}[] = [
  { stat: "hp", label: "Max HP", icon: Heart, description: "Increase maximum health", bonus: "+5 HP" },
  { stat: "mana", label: "Max Mana", icon: Droplets, description: "More mana for magic items", bonus: "+2 Mana" },
  { stat: "strength", label: "Strength", icon: Sword, description: "Deal more damage", bonus: "+2 STR" },
  { stat: "agility", label: "Agility", icon: Wind, description: "Ranged damage & evasion", bonus: "+2 AGI" },
  { stat: "defense", label: "Defense", icon: Shield, description: "Take less damage", bonus: "+1 DEF" },
  { stat: "luck", label: "Luck", icon: Clover, description: "Higher crit chance & bonus XP", bonus: "+2 LCK" },
  { stat: "inventory", label: "Inventory", icon: Package, description: "Carry more items", bonus: "+1 Slot" },
];

const LevelUpDialog: React.FC<LevelUpDialogProps> = ({ open, player, onChoose }) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) setSelected(0);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      const key = e.key.toLowerCase();

      if (key === "w" || key === "arrowup" || key === "8") {
        e.preventDefault();
        setSelected((i) => (i - 1 + STAT_OPTIONS.length) % STAT_OPTIONS.length);
      } else if (key === "s" || key === "arrowdown" || key === "2") {
        e.preventDefault();
        setSelected((i) => (i + 1) % STAT_OPTIONS.length);
      } else if (key === "enter" || key === " " || key === "5") {
        e.preventDefault();
      }
    },
    [open],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      const key = e.key.toLowerCase();

      if (key === "enter" || key === " " || key === "5") {
        e.preventDefault();
        onChoose(STAT_OPTIONS[selected].stat);
      }
    },
    [open, selected, onChoose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        overlayClassName="bg-black/20"
      >
        <DialogHeader>
          <DialogTitle className="text-primary text-center text-lg">⬆ Level Up! — Level {player.level}</DialogTitle>
          <DialogDescription className="text-center">
            Choose a stat to improve (↑↓ to navigate, Enter to select)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {STAT_OPTIONS.map(({ stat, label, icon: Icon, description, bonus }, idx) => (
            <button
              key={stat}
              onClick={() => onChoose(stat)}
              onMouseEnter={() => setSelected(idx)}
              className={`flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 border transition-colors text-left group ${
                idx === selected ? "border-primary ring-1 ring-primary/50" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">{bonus}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpDialog;
