import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Package, StairsIcon, SkipForward } from 'lucide-react';
import { Direction } from '@/game/types';

interface ActionBarProps {
  onMove: (dir: Direction) => void;
  onPass: () => void;
  onPickUp: () => void;
  onDescend: () => void;
  canDescend: boolean;
  hasItem: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({
  onMove, onPass, onPickUp, onDescend, canDescend, hasItem
}) => {
  const btnClass = "bg-secondary hover:bg-secondary/80 text-foreground rounded p-2 transition-colors flex items-center justify-center";
  const disabledClass = "bg-secondary/30 text-muted-foreground/30 rounded p-2 cursor-not-allowed flex items-center justify-center";

  return (
    <div className="bg-card border-t border-border px-4 py-2 flex items-center gap-4">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Move:</span>
        <button className={btnClass} onClick={() => onMove('up')} title="Up (W/↑)">
          <ArrowUp size={14} />
        </button>
        <button className={btnClass} onClick={() => onMove('down')} title="Down (S/↓)">
          <ArrowDown size={14} />
        </button>
        <button className={btnClass} onClick={() => onMove('left')} title="Left (A/←)">
          <ArrowLeft size={14} />
        </button>
        <button className={btnClass} onClick={() => onMove('right')} title="Right (D/→)">
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="h-6 w-px bg-border" />

      <button className={btnClass} onClick={onPass} title="Pass turn (Space)">
        <SkipForward size={14} className="mr-1" />
        <span className="text-xs">Pass</span>
      </button>

      <button
        className={hasItem ? btnClass : disabledClass}
        onClick={onPickUp}
        disabled={!hasItem}
        title="Pick up item (G)"
      >
        <Package size={14} className="mr-1" />
        <span className="text-xs">Pick up</span>
      </button>

      <button
        className={canDescend ? btnClass : disabledClass}
        onClick={onDescend}
        disabled={!canDescend}
        title="Descend stairs (>)"
      >
        <ArrowDown size={14} className="mr-1" />
        <span className="text-xs">Descend</span>
      </button>
    </div>
  );
};

export default ActionBar;
