import React, { useReducer, useCallback, useEffect, useState, useRef } from "react";
import { gameReducer, createInitialState } from "@/game/engine";
import { Direction, LevelUpStat, GameEvent } from "@/game/types";
import GameGrid from "@/components/GameGrid";
import PlayerPanel from "@/components/PlayerPanel";
import CombatLog from "@/components/CombatLog";
import ActionBar from "@/components/ActionBar";
import LevelUpDialog from "@/components/LevelUpDialog";
import TitleScreen from "@/components/TitleScreen";
import { RotateCcw, Maximize, Minimize, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  sfxHit,
  sfxPlayerHit,
  sfxKill,
  sfxPickup,
  sfxLevelUp,
  sfxDescend,
  sfxEvade,
  sfxCrit,
  sfxNoEnergy,
  sfxHeal,
  sfxCast,
  sfxThrow,
  sfxFireball,
  sfxIceBlast,
} from "@/game/sfx";

function processEvents(events: GameEvent[]) {
  events.forEach((ev) => {
    switch (ev.type) {
      case "player_attack":
        sfxHit();
        break;
      case "player_hit":
        sfxPlayerHit();
        break;
      case "enemy_killed":
        sfxKill();
        break;
      case "pickup":
        sfxPickup();
        break;
      case "level_up":
        sfxLevelUp();
        break;
      case "descend":
        sfxDescend();
        break;
      case "player_evade":
      case "enemy_evade":
        sfxEvade();
        break;
      case "crit":
        sfxCrit();
        break;
      case "heal":
        sfxHeal();
        break;
      case "no_mana":
        sfxNoEnergy();
        break;
      case "ranged_attack": {
        const traits = ev.traits || [];
        if (traits.includes("FIRE")) sfxFireball();
        else if (traits.includes("ICE")) sfxIceBlast();
        else if (traits.includes("POISON")) sfxThrow();
        else sfxCast();
        break;
      }
    }
  });
}

const GamePage: React.FC = () => {
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState("warrior"));
  const { toast } = useToast();
  const prevInventoryLen = useRef(state.player.inventory.length);
  const [inventoryFlash, setInventoryFlash] = useState(false);
  const [lightTheme, setLightTheme] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', lightTheme);
    localStorage.setItem('theme', lightTheme ? 'light' : 'dark');
  }, [lightTheme]);

  // Process game events for sfx + toasts
  useEffect(() => {
    if (state.events.length === 0) return;
    processEvents(state.events);

    if (state.events.some((e) => e.type === "no_mana")) {
      toast({
        title: "Not Enough Mana!",
        description: "Wait for mana to regenerate or use non-magic items.",
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
    dispatch({ type: "NEW_GAME", characterId });
    setScreen("game");
  }, []);

  const handleMove = useCallback((dir: Direction) => {
    dispatch({ type: "MOVE", direction: dir });
  }, []);

  const handlePass = useCallback(() => dispatch({ type: "PASS_TURN" }), []);
  const handlePickUp = useCallback(() => dispatch({ type: "PICK_UP" }), []);
  const handleDescend = useCallback(() => dispatch({ type: "DESCEND" }), []);
  const handleNewGame = useCallback(() => setScreen("title"), []);

  const handleUseItem = useCallback((itemId: string) => {
    dispatch({ type: "USE_ITEM", itemId });
  }, []);

  const handleDropItem = useCallback((itemId: string) => {
    dispatch({ type: "DROP_ITEM", itemId });
  }, []);

  const handleCancelTarget = useCallback(() => {
    dispatch({ type: "SET_TARGET_MODE", item: null });
  }, []);

  const handleTileClick = useCallback(
    (pos: { x: number; y: number }) => {
      if (state.targetMode) {
        dispatch({ type: "TARGET_TILE", pos });
      }
    },
    [state.targetMode],
  );

  const handleLevelUpChoice = useCallback((stat: LevelUpStat) => {
    dispatch({ type: "LEVEL_UP_CHOICE", stat });
  }, []);

  useEffect(() => {
    if (screen !== "game") return;

    const getPlayerTile = () => state.grid[state.player.pos.y]?.[state.player.pos.x];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.gameOver || state.victory || state.pendingLevelUp) return;
      const key = e.key.toLowerCase();
      const code = e.code;
      const isNumpad = code.startsWith("Numpad");

      if (key === "escape") {
        dispatch({ type: "SET_TARGET_MODE", item: null });
        return;
      }

      const numpadDirMap: Record<string, Direction> = {
        Numpad8: "up",
        Numpad2: "down",
        Numpad4: "left",
        Numpad6: "right",
        Numpad7: "up-left",
        Numpad9: "up-right",
        Numpad1: "down-left",
        Numpad3: "down-right",
      };

      const dirMap: Record<string, Direction> = {
        w: "up",
        arrowup: "up",
        s: "down",
        arrowdown: "down",
        a: "left",
        arrowleft: "left",
        d: "right",
        arrowright: "right",
        q: "up-left",
        e: "up-right",
        z: "down-left",
        c: "down-right",
      };

      if (isNumpad && numpadDirMap[code]) {
        e.preventDefault();
        handleMove(numpadDirMap[code]);
      } else if (code === "Numpad5") {
        e.preventDefault();
        handlePass();
      } else if (!isNumpad && dirMap[key]) {
        e.preventDefault();
        handleMove(dirMap[key]);
      } else if (key === " ") {
        e.preventDefault();
        handlePass();
      } else if (key === "f") {
        e.preventDefault();
        if (state.player.equippedWeapon) {
          handleUseItem(state.player.equippedWeapon.id);
        }
      } else if (!isNumpad && /^[1-9]$/.test(key)) {
        e.preventDefault();
        const idx = parseInt(key) - 1;
        if (idx < state.player.inventory.length) {
          handleUseItem(state.player.inventory[idx].id);
        }
      } else if (!isNumpad && key === "0") {
        e.preventDefault();
        const idx = 9;
        if (idx < state.player.inventory.length) {
          handleUseItem(state.player.inventory[idx].id);
        }
      } else if (key === "g") {
        e.preventDefault();
        const pTile = getPlayerTile();
        if (pTile?.type === "stairs" || pTile?.type === "treasure") {
          handleDescend();
        } else {
          handlePickUp();
        }
      } else if (key === "enter") {
        const pTile = getPlayerTile();
        if (pTile?.type === "stairs" || pTile?.type === "treasure") {
          e.preventDefault();
        }
      } else if (key === ">") {
        handleDescend();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (state.gameOver || state.victory || state.pendingLevelUp) return;
      if (e.key.toLowerCase() !== "enter") return;

      const pTile = getPlayerTile();
      if (pTile?.type === "stairs" || pTile?.type === "treasure") {
        e.preventDefault();
        handleDescend();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    screen,
    state.gameOver,
    state.pendingLevelUp,
    state.victory,
    state.grid,
    state.player.pos,
    state.player.equippedWeapon,
    state.player.inventory,
    handleMove,
    handlePass,
    handlePickUp,
    handleDescend,
    handleUseItem,
  ]);

  if (screen === "title") {
    return <TitleScreen onStart={handleStartGame} />;
  }

  const playerTile = state.grid[state.player.pos.y]?.[state.player.pos.x];
  const canDescend = playerTile?.type === "stairs" || playerTile?.type === "treasure";
  const hasItemOnGround = !!playerTile?.item;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="h-10 bg-card border-b border-border flex items-center px-4 justify-between shrink-0">
        <h1 className="text-primary font-bold text-sm tracking-widest uppercase">⚔ Browser Dungeon Roguelike</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLightTheme(prev => !prev)}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            {lightTheme ? <Moon size={12} /> : <Sun size={12} />} {lightTheme ? 'Dark' : 'Light'}
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            {document.fullscreenElement ? <Minimize size={12} /> : <Maximize size={12} />} Full Screen
          </button>
          <button
            onClick={handleNewGame}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} /> New Game
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 min-w-0 w-full">
        <PlayerPanel
          player={state.player}
          floor={state.floor}
          turn={state.turn}
          targetMode={!!state.targetMode}
          onUseItem={handleUseItem}
          onDropItem={handleDropItem}
          onCancelTarget={handleCancelTarget}
          canDrop={!playerTile?.item}
          inventoryFlash={inventoryFlash}
        />

        <div className="flex-1 relative min-h-0 min-w-0 bg-game-grid">
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
            playerTileItem={
              playerTile?.item ? { name: playerTile.item.name, description: playerTile.item.description, rarity: playerTile.item.rarity } : null
            }
          />
          {state.gameOver && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-start sm:justify-center p-4 overflow-y-auto z-50">
              <div className="mt-8 sm:mt-0 text-accent text-2xl font-bold mb-2">Game Over</div>
              <p className="text-muted-foreground text-sm mb-4">
                You reached floor {state.floor}, level {state.player.level}
              </p>
              <button
                onClick={handleNewGame}
                className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors mb-8"
              >
                Try Again
              </button>
            </div>
          )}
          {state.victory && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-start sm:justify-center p-4 overflow-y-auto z-50">
              <div className="mt-8 sm:mt-0 text-primary text-3xl font-bold mb-2">🏆 Victory!</div>
              <div className="text-foreground text-lg font-medium mb-1">You claimed "The Artifact"!</div>
              <p className="text-muted-foreground text-sm mb-1 text-center font-mono">
                Conquered all {state.floor} floors as {state.player.name}
              </p>
              <p className="text-muted-foreground text-sm mb-4 text-center">
                Level {state.player.level} • Turn {state.turn}
              </p>
              <button
                onClick={handleNewGame}
                className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors mb-8 shrink-0"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        <div className="w-[26%] min-w-[112px] max-w-[280px] sm:w-1/4 bg-card border-l border-border flex flex-col h-full shrink-0">
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

      <LevelUpDialog open={state.pendingLevelUp} player={state.player} onChoose={handleLevelUpChoice} />
    </div>
  );
};

export default GamePage;
