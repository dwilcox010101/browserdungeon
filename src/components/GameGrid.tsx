import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tile, Position, GameEvent, Trait } from '@/game/types';
import { RARITY_LABEL, RARITY_COLORS, RARITY_BORDER } from '@/game/items';
import {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame,
  Gem, ArrowDown, Package, Zap, Shield, Crown,
  Target, Dog, Flower2, Crosshair, Axe, Wand
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ICON_MAP: Record<string, React.ElementType> = {
  Sword, Bug, Skull, Droplets, Bird, Ghost, Flame, Zap, Shield,
  Target, Dog, Flower2, Crosshair, Axe, Wand,
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

  const groundItemTooltipPosition = useMemo(() => {
    if (!playerTileItem || dims.w <= 0 || typeof window === 'undefined' || !containerRef.current) {
      return null;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const gridWidth = viewportWidth * TILE_SIZE;
    const gridLeft = rect.left + Math.max(0, (rect.width - gridWidth) / 2);
    const rawLeft = gridLeft + (playerPos.x - viewport.startX) * TILE_SIZE + TILE_SIZE / 2;
    const top = rect.top + (playerPos.y - viewport.startY) * TILE_SIZE - 8;
    const estimatedTooltipWidth = window.innerWidth < 640 ? 220 : 320;
    const edgePadding = 8;

    if (rawLeft < estimatedTooltipWidth / 2 + edgePadding) {
      return { left: edgePadding, top, align: 'left' as const };
    }

    if (rawLeft > window.innerWidth - estimatedTooltipWidth / 2 - edgePadding) {
      return { left: window.innerWidth - edgePadding, top, align: 'right' as const };
    }

    return { left: rawLeft, top, align: 'center' as const };
  }, [dims.w, playerPos.x, playerPos.y, playerTileItem, viewport.startX, viewport.startY, viewportWidth]);

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

  // Clean up old projectiles
  useEffect(() => {
    if (projectiles.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setProjectiles(prev => prev.filter(p => now - p.startTime < 400));
    }, 450);
    return () => clearTimeout(timer);
  }, [projectiles]);

  // Animate projectiles with requestAnimationFrame
  const [, setTick] = useState(0);
  useEffect(() => {
    if (projectiles.length === 0) return;
    let raf: number;
    const animate = () => {
      setTick(t => t + 1);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [projectiles.length > 0]);

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
                        {isEnemy && EntityIcon && (() => {
                          const e = tile.entity!;
                          const threat = e.attack + e.defense + Math.floor(e.maxHp / 5) + e.dodge + e.rangeAttack + (e.speed > 1 ? 3 : 0);
                          // threat ranges roughly 2 (Rat) to 50+ (Demon Lord)
                          const t = Math.min(threat / 40, 1);
                          // Light pink for weak, deep crimson for strong
                          const lightness = Math.round(75 - t * 40); // 75% down to 35%
                          const saturation = Math.round(50 + t * 40); // 50% up to 90%
                          const enemyColor = `hsl(0, ${saturation}%, ${lightness}%)`;
                          return (
                            <EntityIcon
                              className={flashColor ? 'animate-[wiggle_0.2s_ease-in-out]' : ''}
                              style={{ color: enemyColor }}
                              size={14}
                            />
                          );
                        })()}
                        {hasItem && !tile.entity && (
                          <Package className={RARITY_COLORS[tile.item!.rarity]} size={12} />
                        )}
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

      {playerTileItem && groundItemTooltipPosition && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: groundItemTooltipPosition.left,
              top: groundItemTooltipPosition.top,
              transform: groundItemTooltipPosition.align === 'left'
                ? 'translateY(-100%)'
                : groundItemTooltipPosition.align === 'right'
                  ? 'translate(-100%, -100%)'
                  : 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground shadow-lg max-w-[min(22rem,calc(100vw-1rem))] whitespace-normal break-words">
              <span className="text-game-item font-medium">{playerTileItem.name}</span>
              <span className="text-muted-foreground ml-1">— {playerTileItem.description}</span>
            </div>
          </div>,
          document.body,
        )}

      {/* Projectile trails */}
      {projectiles.map(proj => {
        const age = Date.now() - proj.startTime;
        const progress = Math.min(age / 300, 1);
        const opacity = 1 - Math.max(0, (age - 150) / 250);
        const currentX = proj.fromX + (proj.toX - proj.fromX) * progress;
        const currentY = proj.fromY + (proj.toY - proj.fromY) * progress;

        return (
          <svg
            key={proj.id}
            className="absolute inset-0 pointer-events-none z-20"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Trail line */}
            <line
              x1={proj.fromX}
              y1={proj.fromY}
              x2={currentX}
              y2={currentY}
              stroke={proj.color}
              strokeWidth={2}
              opacity={opacity * 0.6}
              strokeLinecap="round"
            />
            {/* Projectile head */}
            <circle
              cx={currentX}
              cy={currentY}
              r={3}
              fill={proj.color}
              opacity={opacity}
            />
            {/* Glow effect */}
            <circle
              cx={currentX}
              cy={currentY}
              r={6}
              fill={proj.color}
              opacity={opacity * 0.3}
            />
            {/* Impact burst at destination */}
            {progress >= 0.9 && (
              <circle
                cx={proj.toX}
                cy={proj.toY}
                r={8 + (progress - 0.9) * 80}
                fill="none"
                stroke={proj.color}
                strokeWidth={1.5}
                opacity={opacity * 0.5}
              />
            )}
          </svg>
        );
      })}

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
