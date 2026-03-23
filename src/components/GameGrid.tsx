import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Tile, Position } from '@/game/types';
import {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame,
  Gem, ArrowDown, Package
} from 'lucide-react';

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

const TILE_SIZE = 24;

const GameGrid: React.FC<GameGridProps> = ({ grid, playerPos, targetMode, onTileClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const updateDims = useCallback(() => {
    if (containerRef.current) {
      setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    }
  }, []);

  useEffect(() => {
    updateDims();
    const ro = new ResizeObserver(updateDims);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateDims]);

  const viewportWidth = Math.max(1, Math.floor(dims.w / TILE_SIZE));
  const viewportHeight = Math.max(1, Math.floor(dims.h / TILE_SIZE));

  const viewport = useMemo(() => {
    const halfW = Math.floor(viewportWidth / 2);
    const halfH = Math.floor(viewportHeight / 2);
    let startX = playerPos.x - halfW;
    let startY = playerPos.y - halfH;
    startX = Math.max(0, Math.min(startX, grid[0].length - viewportWidth));
    startY = Math.max(0, Math.min(startY, grid.length - viewportHeight));
    return { startX, startY };
  }, [playerPos, grid, viewportWidth, viewportHeight]);

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
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {dims.w > 0 && dims.h > 0 && (
        <TooltipProvider delayDuration={200}>
          <div
            className="bg-game-grid select-none mx-auto"
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
      )}
    </div>
  );
};

export default GameGrid;
