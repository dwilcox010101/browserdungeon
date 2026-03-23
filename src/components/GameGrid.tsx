import React, { useMemo } from 'react';
import { Tile, Position } from '@/game/types';
import {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame,
  Gem, ArrowDown, Package
} from 'lucide-react';

// ... keep existing code
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ICON_MAP: Record<string, React.ElementType> = {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame,
};

interface GameGridProps {
  grid: Tile[][];
  playerPos: Position;
  targetMode: { range: number } | null;
  onTileClick: (pos: Position) => void;
}

const TILE_SIZE = 20;

const GameGrid: React.FC<GameGridProps> = ({ grid, playerPos, targetMode, onTileClick }) => {
  const viewportWidth = 21;
  const viewportHeight = 17;

  const viewport = useMemo(() => {
    const halfW = Math.floor(viewportWidth / 2);
    const halfH = Math.floor(viewportHeight / 2);
    let startX = playerPos.x - halfW;
    let startY = playerPos.y - halfH;
    startX = Math.max(0, Math.min(startX, grid[0].length - viewportWidth));
    startY = Math.max(0, Math.min(startY, grid.length - viewportHeight));
    return { startX, startY };
  }, [playerPos, grid]);

  const manhattan = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const getTileTooltip = (tile: Tile): string | null => {
    if (!tile.visible) return null;
    if (tile.entity?.isPlayer) return 'You (Hero)';
    if (tile.entity && !tile.entity.isPlayer) {
      return `${tile.entity.name} — HP: ${tile.entity.hp}/${tile.entity.maxHp} ATK: ${tile.entity.attack} DEF: ${tile.entity.defense}`;
    }
    if (tile.item) return `${tile.item.name} — ${tile.item.description}`;
    if (tile.type === 'stairs') return 'Stairs — Descend to next floor (>)';
    return null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="bg-game-grid border border-border rounded overflow-hidden select-none"
        style={{
          width: viewportWidth * TILE_SIZE,
          height: viewportHeight * TILE_SIZE,
          display: 'grid',
          gridTemplateColumns: `repeat(${viewportWidth}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${viewportHeight}, ${TILE_SIZE}px)`,
        }}
      >
        {Array.from({ length: viewportHeight }, (_, vy) =>
          Array.from({ length: viewportWidth }, (_, vx) => {
            const x = viewport.startX + vx;
            const y = viewport.startY + vy;
            const tile = grid[y]?.[x];
            if (!tile) return <div key={`${vx}-${vy}`} className="bg-game-grid" />;

            const isPlayer = tile.entity?.isPlayer;
            const isEnemy = tile.entity && !tile.entity.isPlayer;
            const hasItem = !!tile.item;
            const isStairs = tile.type === 'stairs';
            const inRange = targetMode && manhattan(playerPos, { x, y }) <= targetMode.range;

            let bgClass = 'bg-game-grid';
            if (tile.visible) {
              bgClass = tile.type === 'wall' ? 'bg-game-wall' : 'bg-game-floor';
              if (isStairs) bgClass = 'bg-primary/20';
            } else if (tile.explored) {
              bgClass = tile.type === 'wall' ? 'bg-game-wall/30' : 'bg-game-floor/30';
            }

            const EntityIcon = tile.entity ? ICON_MAP[tile.entity.icon] : null;
            const tooltip = getTileTooltip(tile);

            const tileContent = (
              <div
                className={`${bgClass} flex items-center justify-center cursor-pointer transition-colors duration-75 ${
                  inRange ? 'ring-1 ring-inset ring-primary/50' : ''
                } ${targetMode && !inRange ? 'opacity-50' : ''}`}
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
                onClick={() => onTileClick({ x, y })}
              >
                {tile.visible && (
                  <>
                    {isPlayer && (
                      <Sword className="text-game-player" size={14} />
                    )}
                    {isEnemy && EntityIcon && (
                      <EntityIcon className="text-game-enemy" size={14} />
                    )}
                    {hasItem && !tile.entity && (
                      <Package className="text-game-item" size={12} />
                    )}
                    {isStairs && !tile.entity && !hasItem && (
                      <ArrowDown className="text-primary" size={14} />
                    )}
                  </>
                )}
              </div>
            );

            if (tooltip) {
              return (
                <Tooltip key={`${vx}-${vy}`}>
                  <TooltipTrigger asChild>{tileContent}</TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-48">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={`${vx}-${vy}`}>{tileContent}</React.Fragment>;
          })
        )}
      </div>
    </TooltipProvider>
  );
};

export default GameGrid;
