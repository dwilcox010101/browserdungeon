import React, { useState } from 'react';
import { CHARACTERS, CharacterDef, isCharacterUnlocked, getMaxFloorReached } from '@/game/characters';
import { Heart, Zap, Sword, Shield, Package, Lock, Flame, Ghost, Skull } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Sword, Zap, Flame, Shield, Ghost, Skull,
};

interface TitleScreenProps {
  onStart: (characterId: string) => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [selected, setSelected] = useState<string>('warrior');
  const maxFloor = getMaxFloorReached();

  const selectedChar = CHARACTERS.find(c => c.id === selected)!;
  const unlocked = isCharacterUnlocked(selectedChar);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-primary font-bold text-3xl tracking-widest uppercase mb-2">
          ⚔ Dungeon of Verbs
        </h1>
        <p className="text-muted-foreground text-sm">Choose your champion</p>
        {maxFloor > 1 && (
          <p className="text-muted-foreground text-xs mt-1">Deepest floor reached: {maxFloor}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg w-full">
        {CHARACTERS.map(char => {
          const isUnlocked = isCharacterUnlocked(char);
          const Icon = ICON_MAP[char.icon] || Sword;
          return (
            <button
              key={char.id}
              onClick={() => isUnlocked && setSelected(char.id)}
              className={`relative p-3 rounded-lg border transition-all text-left ${
                selected === char.id
                  ? 'border-primary bg-primary/10'
                  : isUnlocked
                    ? 'border-border bg-card hover:border-primary/40'
                    : 'border-border bg-card/50 opacity-60 cursor-not-allowed'
              }`}
            >
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg z-10">
                  <div className="text-center">
                    <Lock size={16} className="text-muted-foreground mx-auto mb-1" />
                    <span className="text-[10px] text-muted-foreground">
                      Floor {char.unlockRequirement!.floor}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className="text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground">{char.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{char.description}</p>
            </button>
          );
        })}
      </div>

      {/* Selected character detail */}
      <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full mb-6">
        <div className="flex items-center gap-2 mb-3">
          {(() => { const Icon = ICON_MAP[selectedChar.icon] || Sword; return <Icon size={20} className="text-primary" />; })()}
          <h2 className="text-foreground font-bold">{selectedChar.name}</h2>
        </div>
        <p className="text-muted-foreground text-xs mb-3">{selectedChar.description}</p>

        <div className="grid grid-cols-4 gap-2 text-xs mb-3">
          <div className="bg-secondary rounded p-2 flex items-center gap-1">
            <Heart size={10} className="text-game-health" /> {selectedChar.hp}
          </div>
          <div className="bg-secondary rounded p-2 flex items-center gap-1">
            <Zap size={10} className="text-game-energy" /> {selectedChar.energy}
          </div>
          <div className="bg-secondary rounded p-2 flex items-center gap-1">
            <Sword size={10} className="text-primary" /> {selectedChar.attack}
          </div>
          <div className="bg-secondary rounded p-2 flex items-center gap-1">
            <Shield size={10} className="text-primary" /> {selectedChar.defense}
          </div>
        </div>

        <div className="text-xs space-y-1">
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">Weapon:</span> {selectedChar.startWeapon.name}
          </div>
          {selectedChar.startArmor && (
            <div className="text-muted-foreground">
              <span className="text-foreground font-medium">Armor:</span> {selectedChar.startArmor.name}
            </div>
          )}
          {selectedChar.startItems.length > 0 && (
            <div className="text-muted-foreground">
              <span className="text-foreground font-medium">Items:</span> {selectedChar.startItems.map(i => i.name).join(', ')}
            </div>
          )}
          <div className="text-muted-foreground flex items-center gap-1">
            <Package size={10} /> {selectedChar.inventorySize} slots
          </div>
        </div>
      </div>

      <button
        onClick={() => unlocked && onStart(selected)}
        disabled={!unlocked}
        className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Enter the Dungeon
      </button>
    </div>
  );
};

export default TitleScreen;
