import React from 'react';
import { LevelUpStat, Entity } from '@/game/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Heart, Zap, Sword, Shield, Package, Clover, Wind } from 'lucide-react';

interface LevelUpDialogProps {
  open: boolean;
  player: Entity;
  onChoose: (stat: LevelUpStat) => void;
}

const STAT_OPTIONS: { stat: LevelUpStat; label: string; icon: React.ElementType; description: string; bonus: string }[] = [
  { stat: 'hp', label: 'Max HP', icon: Heart, description: 'Increase maximum health', bonus: '+5 HP' },
  { stat: 'energy', label: 'Max Energy', icon: Zap, description: 'More actions per turn', bonus: '+1 Energy' },
  { stat: 'attack', label: 'Attack', icon: Sword, description: 'Deal more damage', bonus: '+2 ATK' },
  { stat: 'defense', label: 'Defense', icon: Shield, description: 'Take less damage', bonus: '+1 DEF' },
  { stat: 'luck', label: 'Luck', icon: Clover, description: 'Higher crit chance & bonus XP', bonus: '+2 LCK' },
  { stat: 'dodge', label: 'Dodge', icon: Wind, description: 'Chance to avoid attacks entirely', bonus: '+2 DDG' },
  { stat: 'inventory', label: 'Inventory', icon: Package, description: 'Carry more items', bonus: '+1 Slot' },
];

const LevelUpDialog: React.FC<LevelUpDialogProps> = ({ open, player, onChoose }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-primary text-center text-lg">
            ⬆ Level Up! — Level {player.level}
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose a stat to improve
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {STAT_OPTIONS.map(({ stat, label, icon: Icon, description, bonus }) => (
            <button
              key={stat}
              onClick={() => onChoose(stat)}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 transition-colors text-left group"
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
