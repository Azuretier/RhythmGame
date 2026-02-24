'use client';

// =============================================================
// Echoes of Eternity — Main Game Container
// =============================================================

import { useCallback } from 'react';
import { EchoesProvider, useEchoes } from '@/lib/echoes/context';
import { EchoesMainMenu } from './EchoesMainMenu';
import { EchoesLobby } from './EchoesLobby';
import { CharacterSelect } from './CharacterSelect';
import { CombatArena } from './CombatArena';
import { ExplorationMap } from './ExplorationMap';
import { CraftingStation } from './CraftingStation';
import { GachaScreen } from './GachaScreen';
import { GameHUD } from './GameHUD';
import { ResultsScreen } from './ResultsScreen';

function EchoesGameInner() {
  const { state, setPhase } = useEchoes();
  const { gamePhase } = state;

  const handleBack = useCallback(() => {
    setPhase('main_menu');
  }, [setPhase]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            ECHOES OF ETERNITY
          </div>
          <div className="mt-4 text-zinc-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/50 via-black to-purple-950/30 pointer-events-none" />

      {/* Game HUD overlay (shown during gameplay) */}
      {(gamePhase === 'combat' || gamePhase === 'exploration' || gamePhase === 'crafting') && (
        <GameHUD />
      )}

      {/* Main content */}
      <div className="relative z-10">
        {gamePhase === 'main_menu' && <EchoesMainMenu />}
        {gamePhase === 'lobby' && <EchoesLobby />}
        {gamePhase === 'character_select' && <CharacterSelect onBack={handleBack} />}
        {gamePhase === 'combat' && <CombatArena />}
        {gamePhase === 'exploration' && <ExplorationMap />}
        {gamePhase === 'crafting' && <CraftingStation />}
        {gamePhase === 'gacha' && <GachaScreen />}
        {gamePhase === 'reward' && <ResultsScreen />}
        {gamePhase === 'build' && <ExplorationMap />}
      </div>
    </div>
  );
}

export default function EchoesGame() {
  return (
    <EchoesProvider>
      <EchoesGameInner />
    </EchoesProvider>
  );
}
