import React, { useEffect, useRef } from 'react';
import { LogEntry } from '@/game/types';

interface CombatLogProps {
  log: LogEntry[];
}

const typeColors: Record<LogEntry['type'], string> = {
  info: 'text-foreground',
  combat: 'text-primary',
  pickup: 'text-game-item',
  system: 'text-muted-foreground',
  damage: 'text-game-enemy',
};

const CombatLog: React.FC<CombatLogProps> = ({ log }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length]);

  return (
    <div className="bg-card border-t border-border flex flex-col" style={{ height: 160 }}>
      <div className="px-3 py-1.5 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
        Combat Log
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {log.map(entry => (
          <div key={entry.id} className={`text-xs ${typeColors[entry.type]}`}>
            <span className="text-muted-foreground/50 mr-1">[{entry.turn}]</span>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CombatLog;
