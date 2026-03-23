import React, { useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { gameReducer, createInitialState } from '@/game/engine';
import { Direction, LevelUpStat, GameEvent } from '@/game/types';
import GameGrid from '@/components/GameGrid';
import PlayerPanel from '@/components/PlayerPanel';
import CombatLog from '@/components/CombatLog';
import ActionBar from '@/components/ActionBar';
import LevelUpDialog from '@/components/LevelUpDialog';
import TitleScreen from '@/components/TitleScreen';
import { RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  sfxHit, sfxPlayerHit, sfxKill, sfxPickup, sfxLevelUp,
  sfxDescend, sfxDodge, sfxCrit, sfxNoEnergy, sfxHeal
} from '@/game/sfx';

function processEvents(events: GameEvent[]) {
  events.forEach(ev => {
    switch (ev.type) {
      case 'player_attack': sfxHit(); break;
      case 'player_hit': sfxPlayerHit(); break;
      case 'enemy_killed': sfxKill(); break;
      case 'pickup': sfxPickup(); break;
      case 'level_up': sfxLevelUp(); break;
      case 'descend': sfxDescend(); break;
      case 'player_dodge':
      case 'enemy_dodge': sfxDodge(); break;
      case 'crit': sfxCrit(); break;
      case 'heal': sfxHeal(); break;
      case 'no_energy': sfxNoEnergy(); break;
    }
  });
}

const GamePage: React.FC = () => {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState('warrior'));
  const { toast } = useToast();
  const prevInventoryLen = useRef(state.player.inventory.length);
  const [inventoryFlash, setInventoryFlash] = useState(false);

  // Process game events for sfx + toasts
  useEffect(() => {
    if (state.events.length === 0) return;
    processEvents(state.events);

    if (state.events.some(e => e.type === 'no_energy')) {
      toast({
        title: "Out of Energy!",
        description: "Pass turn (Space) to recover energy.",
        variant: "destructive",
        duration: 2000,
      });
    }
  }, [state.events, toast]);

  // Inventory flash animation
  useEffect(() => {
    const newLen = state.player.inventory.length;
    if (newLen > prevInventoryLen.current) {
      setInventoryFlash(true);
      const timer = setTimeout(() => setInventoryFlash(false), 400);
      prevInventoryLen.current = newLen;
      return () => clearTimeout(timer);
    }
    prevInventoryLen.current = newLen;
  }, [state.player.inventory.length]);

  const handleStartGame = useCallback((characterId: string) => {
    dispatch({ type: 'NEW_GAME', characterId });
    setScreen('game');
  }, []);

  const handleMove = useCallback((dir: Direction) => {
    dispatch({ type: 'MOVE', direction: dir });
  }, []);

  const handlePass = useCallback(() => dispatch({ type: 'PASS_TURN' }), []);
  const handlePickUp = useCallback(() => dispatch({ type: 'PICK_UP' }), []);
  const handleDescend = useCallback(() => dispatch({ type: 'DESCEND' }), []);
  const handleNewGame = useCallback(() => setScreen('title'), []);

  const handleUseItem = useCallback((itemId: string) => {
    dispatch({ type: 'USE_ITEM', itemId });
  }, []);

  const handleCancelTarget = useCallback(() => {
    dispatch({ type: 'SET_TARGET_MODE', item: null });
  }, []);

  const handleTileClick = useCallback((pos: { x: number; y: number }) => {
    if (state.targetMode) {
      dispatch({ type: 'TARGET_TILE', pos });
    }
  }, [state.targetMode]);

  const handleLevelUpChoice = useCallback((stat: LevelUpStat) => {
    dispatch({ type: 'LEVEL_UP_CHOICE', stat });
  }, []);

  useEffect(() => {
    if (screen !== 'game') return;
    const handler = (e: KeyboardEvent) => {
      if (state.gameOver || state.pendingLevelUp) return;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        dispatch({ type: 'SET_TARGET_MODE', item: null });
        return;
      }

      const dirMap: Record<string, Direction> = {
        w: 'up', arrowup: 'up', '8': 'up',
        s: 'down', arrowdown: 'down', '2': 'down',
        a: 'left', arrowleft: 'left', '4': 'left',
        d: 'right', arrowright: 'right', '6': 'right',
        q: 'up-left', '7': 'up-left',
        e: 'up-right', '9': 'up-right',
        z: 'down-left', '1': 'down-left',
        c: 'down-right', '3': 'down-right',
      };

      if (dirMap[key]) {
        e.preventDefault();
        handleMove(dirMap[key]);
      } else if (key === ' ' || key === '5') {
        e.preventDefault();
        handlePass();
      } else if (key === 'g') {
        handlePickUp();
      } else if (key === '>') {
        handleDescend();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, state.gameOver, state.pendingLevelUp, handleMove, handlePass, handlePickUp, handleDescend]);

  if (screen === 'title') {
    return <TitleScreen onStart={handleStartGame} />;
  }

  const playerTile = state.grid[state.player.pos.y]?.[state.player.pos.x];
  const canDescend = playerTile?.type === 'stairs';
  const hasItemOnGround = !!playerTile?.item;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="h-10 bg-card border-b border-border flex items-center px-4 justify-between shrink-0">
        <h1 className="text-primary font-bold text-sm tracking-widest uppercase">
          ⚔ Dungeon of Verbs
        </h1>
        <button
          onClick={handleNewGame}
          className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} /> New Game
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <PlayerPanel
          player={state.player}
          floor={state.floor}
          turn={state.turn}
          targetMode={!!state.targetMode}
          onUseItem={handleUseItem}
          onCancelTarget={handleCancelTarget}
          inventoryFlash={inventoryFlash}
        />

        <div className="flex-1 relative min-h-0 bg-game-grid">
          {state.targetMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/20 text-primary text-xs px-3 py-1 rounded z-10">
              Click a tile to target • ESC to cancel
            </div>
          )}
          <GameGrid
            grid={state.grid}
            playerPos={state.player.pos}
            targetMode={state.targetMode}
            onTileClick={handleTileClick}
            events={state.events}
          />
          {state.gameOver && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <div className="text-accent text-2xl font-bold mb-2">Game Over</div>
              <p className="text-muted-foreground text-sm mb-4">
                You reached floor {state.floor}, level {state.player.level}
              </p>
              <button
                onClick={handleNewGame}
                className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="w-72 bg-card border-l border-border flex flex-col h-full">
          <CombatLog log={state.log} />
          <ActionBar
            onMove={handleMove}
            onPass={handlePass}
            onPickUp={handlePickUp}
            onDescend={handleDescend}
            canDescend={canDescend}
            hasItem={hasItemOnGround}
          />
        </div>
      </div>

      <LevelUpDialog
        open={state.pendingLevelUp}
        player={state.player}
        onChoose={handleLevelUpChoice}
      />
    </div>
  );
};

export default GamePage;
