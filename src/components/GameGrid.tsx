import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Tile, Position, GameEvent, Trait } from '@/game/types';
import { RARITY_LABEL } from '@/game/items';
import {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame,
  Gem, ArrowDown, Package, Zap, Shield, Crown
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ICON_MAP: Record<string, React.ElementType> = {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame, Zap, Shield,
};

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
}

interface FlashTile {
  x: number;
  y: number;
  color: string;
  startTime: number;
}

interface Projectile {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  startTime: number;
  traits: Trait[];
}

interface GameGridProps {
  grid: Tile[][];
  playerPos: Position;
  targetMode: { range: number } | null;
  onTileClick: (pos: Position) => void;
  events: GameEvent[];
  playerTileItem?: { name: string; description: string } | null;
}

const TILE_SIZE = 24;
let floatIdCounter = 0;

const GameGrid: React.FC<GameGridProps> = ({ grid, playerPos, targetMode, onTileClick, events, playerTileItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [flashTiles, setFlashTiles] = useState<FlashTile[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);

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

  // Process events into floating texts and flashes
  useEffect(() => {
    if (events.length === 0) return;
    const now = Date.now();
    const newFloats: FloatingText[] = [];
    const newFlashes: FlashTile[] = [];

    events.forEach(ev => {
      if (ev.pos) {
        const screenX = (ev.pos.x - viewport.startX) * TILE_SIZE;
        const screenY = (ev.pos.y - viewport.startY) * TILE_SIZE;

        if (ev.type === 'player_attack' && ev.amount) {
          newFloats.push({ id: floatIdCounter++, x: screenX, y: screenY, text: `-${ev.amount}`, color: 'hsl(var(--primary))', startTime: now });
          newFlashes.push({ x: ev.pos.x, y: ev.pos.y, color: 'bg-primary/40', startTime: now });
        } else if (ev.type === 'player_hit' && ev.amount) {
          newFloats.push({ id: floatIdCounter++, x: screenX, y: screenY, text: `-${ev.amount}`, color: 'hsl(var(--game-enemy))', startTime: now });
          newFlashes.push({ x: ev.pos.x, y: ev.pos.y, color: 'bg-game-enemy/40', startTime: now });
        } else if (ev.type === 'heal' && ev.amount) {
          newFloats.push({ id: floatIdCounter++, x: screenX, y: screenY, text: `+${ev.amount}`, color: 'hsl(var(--game-item))', startTime: now });
        } else if (ev.type === 'player_dodge' || ev.type === 'enemy_dodge') {
          newFloats.push({ id: floatIdCounter++, x: screenX, y: screenY, text: 'DODGE', color: 'hsl(var(--game-energy))', startTime: now });
        } else if (ev.type === 'crit') {
          newFloats.push({ id: floatIdCounter++, x: screenX + 12, y: screenY - 8, text: 'CRIT!', color: 'hsl(var(--primary))', startTime: now });
        } else if (ev.type === 'enemy_killed') {
          newFlashes.push({ x: ev.pos.x, y: ev.pos.y, color: 'bg-primary/60', startTime: now });
        } else if (ev.type === 'level_up') {
          newFloats.push({ id: floatIdCounter++, x: screenX, y: screenY, text: 'LEVEL UP!', color: 'hsl(var(--primary))', startTime: now });
        }
      }

      // Ranged attack projectile
      if (ev.type === 'ranged_attack' && ev.fromPos && ev.toPos) {
        const traits = ev.traits || [];
        let color = 'hsl(var(--primary))';
        if (traits.includes('FIRE')) color = 'hsl(var(--game-enemy))';
        else if (traits.includes('ICE')) color = 'hsl(200, 90%, 60%)';
        else if (traits.includes('POISON')) color = 'hsl(120, 60%, 40%)';

        const fromScreenX = (ev.fromPos.x - viewport.startX) * TILE_SIZE + TILE_SIZE / 2;
        const fromScreenY = (ev.fromPos.y - viewport.startY) * TILE_SIZE + TILE_SIZE / 2;
        const toScreenX = (ev.toPos.x - viewport.startX) * TILE_SIZE + TILE_SIZE / 2;
        const toScreenY = (ev.toPos.y - viewport.startY) * TILE_SIZE + TILE_SIZE / 2;

        setProjectiles(prev => [...prev, {
          id: floatIdCounter++,
          fromX: fromScreenX, fromY: fromScreenY,
          toX: toScreenX, toY: toScreenY,
          color, startTime: now, traits,
        }]);

        // Flash the target tile
        if (ev.toPos) {
          const flashColor = traits.includes('FIRE') ? 'bg-game-enemy/50'
            : traits.includes('ICE') ? 'bg-blue-400/50'
            : traits.includes('POISON') ? 'bg-green-500/50'
            : 'bg-primary/40';
          newFlashes.push({ x: ev.toPos.x, y: ev.toPos.y, color: flashColor, startTime: now });
        }
      }
    });

    if (newFloats.length > 0) setFloatingTexts(prev => [...prev, ...newFloats]);
    if (newFlashes.length > 0) setFlashTiles(prev => [...prev, ...newFlashes]);
  }, [events, viewport.startX, viewport.startY]);

  // Clean up old floating texts
  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setFloatingTexts(prev => prev.filter(f => now - f.startTime < 800));
    }, 850);
    return () => clearTimeout(timer);
  }, [floatingTexts]);

  // Clean up old flashes
  useEffect(() => {
    if (flashTiles.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setFlashTiles(prev => prev.filter(f => now - f.startTime < 200));
    }, 250);
    return () => clearTimeout(timer);
  }, [flashTiles]);

  const manhattan = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const getTileTooltip = (tile: Tile): string | null => {
    if (!tile.visible) return null;
    if (tile.entity?.isPlayer) return 'You (Hero)';
    if (tile.entity && !tile.entity.isPlayer) {
      const effects = tile.entity.statusEffects.length > 0
        ? ` [${tile.entity.statusEffects.map(e => `${e.type}:${e.turnsLeft}t`).join(', ')}]`
        : '';
      return `${tile.entity.name} — HP: ${tile.entity.hp}/${tile.entity.maxHp} ATK: ${tile.entity.attack} DEF: ${tile.entity.defense}${effects}`;
    }
    if (tile.item) return `[${RARITY_LABEL[tile.item.rarity]}] ${tile.item.name} — ${tile.item.description}`;
    if (tile.type === 'stairs') return 'Stairs — Descend to next floor (>)';
    if (tile.type === 'treasure') return '✨ Ancient Treasure Chest — Claim the artifact!';
    return null;
  };

  const isFlashing = (x: number, y: number): string | null => {
    const now = Date.now();
    const flash = flashTiles.find(f => f.x === x && f.y === y && now - f.startTime < 200);
    return flash ? flash.color : null;
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative">
      {dims.w > 0 && dims.h > 0 && (
        <TooltipProvider delayDuration={200}>
          <div
            className="bg-game-grid select-none mx-auto relative"
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
                const isTreasure = tile.type === 'treasure';
                const inRange = targetMode && manhattan(playerPos, { x, y }) <= targetMode.range;
                const flashColor = isFlashing(x, y);

                let bgClass = 'bg-game-grid';
                if (tile.visible) {
                  bgClass = tile.type === 'wall' ? 'bg-game-wall' : 'bg-game-floor';
                  if (isStairs || isTreasure) bgClass = 'bg-primary/20';
                } else if (tile.explored) {
                  bgClass = tile.type === 'wall' ? 'bg-game-wall/30' : 'bg-game-floor/30';
                }

                const EntityIcon = tile.entity ? ICON_MAP[tile.entity.icon] : null;
                const tooltip = getTileTooltip(tile);

                const tileContent = (
                  <div
                    className={`${bgClass} flex items-center justify-center cursor-pointer transition-colors duration-75 ${
                      inRange ? 'ring-1 ring-inset ring-primary/50' : ''
                    } ${targetMode && !inRange ? 'opacity-50' : ''} ${flashColor || ''}`}
                    style={{ width: TILE_SIZE, height: TILE_SIZE }}
                    onClick={() => onTileClick({ x, y })}
                  >
                    {tile.visible && (
                      <>
                        {isPlayer && EntityIcon && (
                          <EntityIcon className={`text-game-player ${flashColor ? 'animate-[wiggle_0.2s_ease-in-out]' : ''}`} size={14} />
                        )}
                        {isEnemy && EntityIcon && (
                          <EntityIcon className={`text-game-enemy ${flashColor ? 'animate-[wiggle_0.2s_ease-in-out]' : ''}`} size={14} />
                        )}
                        {hasItem && !tile.entity && (
                          <Package className={
                            tile.item!.rarity === 'legendary' ? 'text-yellow-400' :
                            tile.item!.rarity === 'epic' ? 'text-purple-400' :
                            tile.item!.rarity === 'rare' ? 'text-blue-400' :
                            tile.item!.rarity === 'uncommon' ? 'text-green-400' :
                            'text-game-item'
                          } size={12} />
                        )}
                        {isStairs && !tile.entity && !hasItem && (
                          <ArrowDown className="text-primary" size={14} />
                        )}
                        {isTreasure && !tile.entity && !hasItem && (
                          <Crown className="text-yellow-400 animate-pulse" size={14} />
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

      {/* Item tooltip above player */}
      {playerTileItem && dims.w > 0 && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: (playerPos.x - viewport.startX) * TILE_SIZE + TILE_SIZE / 2,
            top: (playerPos.y - viewport.startY) * TILE_SIZE - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground shadow-lg whitespace-nowrap">
            <span className="text-game-item font-medium">{playerTileItem.name}</span>
            <span className="text-muted-foreground ml-1">— {playerTileItem.description}</span>
          </div>
        </div>
      )}

      {/* Floating damage/heal numbers */}
      {floatingTexts.map(ft => {
        const age = Date.now() - ft.startTime;
        const progress = Math.min(age / 800, 1);
        const offsetY = -30 * progress;
        const opacity = 1 - progress;

        return (
          <div
            key={ft.id}
            className="absolute pointer-events-none font-bold text-xs whitespace-nowrap z-20"
            style={{
              left: ft.x + TILE_SIZE / 2,
              top: ft.y + offsetY,
              color: ft.color,
              opacity,
              transform: 'translateX(-50%)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              fontSize: ft.text.includes('LEVEL') || ft.text.includes('CRIT') ? '11px' : '10px',
            }}
          >
            {ft.text}
          </div>
        );
      })}
    </div>
  );
};

export default GameGrid;
