'use client';

// =============================================================
// Echoes of Eternity — React Context for Game State
// =============================================================

import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import type {
  EchoesPlayerData,
  EchoesGamePhase,
  GameMode,
  OwnedCharacter,
  Equipment,
  ResourceType,
  GachaPull,
  CombatState,
} from '@/types/echoes';
import { loadPlayerData, savePlayerData, getDefaultPlayerData } from './storage';
import { createOwnedCharacter, experienceForLevel, performGachaPull, DEFAULT_BANNERS } from './characters';
import { canCraft, performCraft, getRecipe, getCraftingXp } from './crafting';

// === State ===

interface EchoesState {
  playerData: EchoesPlayerData;
  gamePhase: EchoesGamePhase;
  selectedMode: GameMode | null;
  /** Active party (up to 4 character IDs) */
  party: string[];
  /** Current combat state (null when not in combat) */
  combat: CombatState | null;
  /** Error message */
  error: string | null;
  /** Loading flag */
  loading: boolean;
}

// === Actions ===

type EchoesAction =
  | { type: 'SET_PHASE'; phase: EchoesGamePhase }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'SET_PARTY'; party: string[] }
  | { type: 'ADD_CHARACTER'; characterId: string }
  | { type: 'LEVEL_UP_CHARACTER'; characterId: string; newLevel: number; newExp: number }
  | { type: 'EQUIP_ITEM'; characterId: string; equipment: Equipment }
  | { type: 'ADD_RESOURCES'; resources: Partial<Record<ResourceType, number>> }
  | { type: 'SPEND_RESOURCES'; resources: Partial<Record<ResourceType, number>> }
  | { type: 'CRAFT_ITEM'; recipeId: string }
  | { type: 'GACHA_PULL'; bannerId: string; pulls: GachaPull[] }
  | { type: 'ADD_EXPERIENCE'; amount: number }
  | { type: 'ADD_EQUIPMENT'; equipment: Equipment }
  | { type: 'SET_COMBAT'; combat: CombatState | null }
  | { type: 'UPDATE_RANKED'; wins?: number; losses?: number; points?: number }
  | { type: 'ADVANCE_STORY' }
  | { type: 'ADVANCE_DUNGEON_FLOOR' }
  | { type: 'ADD_ACHIEVEMENT'; achievementId: string }
  | { type: 'ADD_SEASON_PASS_XP'; xp: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_DATA'; data: EchoesPlayerData };

function reducer(state: EchoesState, action: EchoesAction): EchoesState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, gamePhase: action.phase };

    case 'SET_MODE':
      return { ...state, selectedMode: action.mode };

    case 'SET_PLAYER_NAME':
      return { ...state, playerData: { ...state.playerData, name: action.name } };

    case 'SET_PARTY':
      return { ...state, party: action.party };

    case 'ADD_CHARACTER': {
      const existing = state.playerData.characters.find(c => c.characterId === action.characterId);
      if (existing) {
        // Duplicate: increase constellation
        return {
          ...state,
          playerData: {
            ...state.playerData,
            characters: state.playerData.characters.map(c =>
              c.characterId === action.characterId
                ? { ...c, constellation: Math.min(c.constellation + 1, 6) }
                : c
            ),
          },
        };
      }
      return {
        ...state,
        playerData: {
          ...state.playerData,
          characters: [...state.playerData.characters, createOwnedCharacter(action.characterId)],
        },
      };
    }

    case 'LEVEL_UP_CHARACTER':
      return {
        ...state,
        playerData: {
          ...state.playerData,
          characters: state.playerData.characters.map(c =>
            c.characterId === action.characterId
              ? { ...c, level: action.newLevel, experience: action.newExp }
              : c
          ),
        },
      };

    case 'EQUIP_ITEM': {
      return {
        ...state,
        playerData: {
          ...state.playerData,
          characters: state.playerData.characters.map(c => {
            if (c.characterId !== action.characterId) return c;
            return {
              ...c,
              equipment: {
                ...c.equipment,
                [action.equipment.slot]: action.equipment,
              },
            };
          }),
        },
      };
    }

    case 'ADD_RESOURCES': {
      const newResources = { ...state.playerData.resources };
      for (const [key, value] of Object.entries(action.resources)) {
        const resKey = key as ResourceType;
        newResources[resKey] = (newResources[resKey] || 0) + (value || 0);
      }
      return { ...state, playerData: { ...state.playerData, resources: newResources } };
    }

    case 'SPEND_RESOURCES': {
      const newResources = { ...state.playerData.resources };
      for (const [key, value] of Object.entries(action.resources)) {
        const resKey = key as ResourceType;
        newResources[resKey] = Math.max(0, (newResources[resKey] || 0) - (value || 0));
      }
      return { ...state, playerData: { ...state.playerData, resources: newResources } };
    }

    case 'CRAFT_ITEM': {
      const recipe = getRecipe(action.recipeId);
      if (!recipe) return state;
      if (!canCraft(recipe, state.playerData.resources, state.playerData.craftingLevel)) return state;

      const newResources = performCraft(recipe, state.playerData.resources);
      const craftXp = getCraftingXp(recipe);

      return {
        ...state,
        playerData: {
          ...state.playerData,
          resources: newResources,
          craftingLevel: state.playerData.craftingLevel + (craftXp >= state.playerData.craftingLevel * 100 ? 1 : 0),
        },
      };
    }

    case 'GACHA_PULL': {
      const newGacha = { ...state.playerData.gacha };

      for (const pull of action.pulls) {
        // Update pity
        if (pull.rarity === 'legendary' || pull.rarity === 'mythic') {
          newGacha.pityCounter = { ...newGacha.pityCounter, [pull.bannerId]: 0 };
        } else {
          newGacha.pityCounter = {
            ...newGacha.pityCounter,
            [pull.bannerId]: (newGacha.pityCounter[pull.bannerId] || 0) + 1,
          };
        }

        newGacha.totalPulls = {
          ...newGacha.totalPulls,
          [pull.bannerId]: (newGacha.totalPulls[pull.bannerId] || 0) + 1,
        };

        newGacha.history = [...newGacha.history, pull];
      }

      // Add characters from pulls
      let characters = [...state.playerData.characters];
      for (const pull of action.pulls) {
        if (pull.characterId) {
          const existing = characters.find(c => c.characterId === pull.characterId);
          if (existing) {
            characters = characters.map(c =>
              c.characterId === pull.characterId
                ? { ...c, constellation: Math.min(c.constellation + 1, 6) }
                : c
            );
          } else {
            characters = [...characters, createOwnedCharacter(pull.characterId!)];
          }
        }
      }

      return {
        ...state,
        playerData: {
          ...state.playerData,
          gacha: newGacha,
          characters,
        },
      };
    }

    case 'ADD_EXPERIENCE': {
      let newLevel = state.playerData.level;
      let newExp = state.playerData.experience + action.amount;

      while (newExp >= experienceForLevel(newLevel) && newLevel < 90) {
        newExp -= experienceForLevel(newLevel);
        newLevel++;
      }

      return {
        ...state,
        playerData: { ...state.playerData, level: newLevel, experience: newExp },
      };
    }

    case 'ADD_EQUIPMENT':
      return {
        ...state,
        playerData: {
          ...state.playerData,
          equipmentVault: [...state.playerData.equipmentVault, action.equipment],
        },
      };

    case 'SET_COMBAT':
      return { ...state, combat: action.combat };

    case 'UPDATE_RANKED': {
      const ranked = { ...state.playerData.ranked };
      if (action.wins !== undefined) {
        ranked.wins += action.wins;
        ranked.winStreak += action.wins;
        ranked.bestWinStreak = Math.max(ranked.bestWinStreak, ranked.winStreak);
      }
      if (action.losses !== undefined) {
        ranked.losses += action.losses;
        ranked.winStreak = 0;
      }
      if (action.points !== undefined) {
        ranked.points = Math.max(0, ranked.points + action.points);
      }
      return { ...state, playerData: { ...state.playerData, ranked } };
    }

    case 'ADVANCE_STORY':
      return {
        ...state,
        playerData: { ...state.playerData, storyProgress: state.playerData.storyProgress + 1 },
      };

    case 'ADVANCE_DUNGEON_FLOOR':
      return {
        ...state,
        playerData: { ...state.playerData, dungeonFloor: state.playerData.dungeonFloor + 1 },
      };

    case 'ADD_ACHIEVEMENT': {
      if (state.playerData.achievements.includes(action.achievementId)) return state;
      return {
        ...state,
        playerData: {
          ...state.playerData,
          achievements: [...state.playerData.achievements, action.achievementId],
        },
      };
    }

    case 'ADD_SEASON_PASS_XP': {
      let level = state.playerData.seasonPassLevel;
      let xp = state.playerData.seasonPassXp + action.xp;
      const xpPerLevel = 1000;

      while (xp >= xpPerLevel && level < 100) {
        xp -= xpPerLevel;
        level++;
      }

      return {
        ...state,
        playerData: { ...state.playerData, seasonPassLevel: level, seasonPassXp: xp },
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'RESET_GAME':
      return { ...state, playerData: getDefaultPlayerData(), gamePhase: 'main_menu' };

    case 'LOAD_DATA':
      return { ...state, playerData: action.data, loading: false };

    default:
      return state;
  }
}

// === Context ===

interface EchoesContextValue {
  state: EchoesState;
  dispatch: React.Dispatch<EchoesAction>;
  // Convenience methods
  setPhase: (phase: EchoesGamePhase) => void;
  setMode: (mode: GameMode) => void;
  setPlayerName: (name: string) => void;
  setParty: (party: string[]) => void;
  pullGacha: (bannerId: string, count: number) => GachaPull[];
  craftItem: (recipeId: string) => boolean;
  save: () => void;
}

const EchoesContext = createContext<EchoesContextValue | null>(null);

const initialState: EchoesState = {
  playerData: getDefaultPlayerData(),
  gamePhase: 'main_menu',
  selectedMode: null,
  party: [],
  combat: null,
  error: null,
  loading: true,
};

export function EchoesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load saved data on mount
  useEffect(() => {
    const data = loadPlayerData();
    dispatch({ type: 'LOAD_DATA', data });
  }, []);

  // Auto-save on player data changes
  useEffect(() => {
    if (!state.loading) {
      savePlayerData(state.playerData);
    }
  }, [state.playerData, state.loading]);

  const setPhase = useCallback((phase: EchoesGamePhase) => {
    dispatch({ type: 'SET_PHASE', phase });
  }, []);

  const setMode = useCallback((mode: GameMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const setPlayerName = useCallback((name: string) => {
    dispatch({ type: 'SET_PLAYER_NAME', name });
  }, []);

  const setParty = useCallback((party: string[]) => {
    dispatch({ type: 'SET_PARTY', party });
  }, []);

  const pullGacha = useCallback((bannerId: string, count: number): GachaPull[] => {
    const banner = DEFAULT_BANNERS.find(b => b.id === bannerId);
    if (!banner) return [];

    const pulls: GachaPull[] = [];
    let currentState = { ...state.playerData.gacha };

    for (let i = 0; i < count; i++) {
      const pull = performGachaPull(banner, currentState);
      pulls.push(pull);

      // Update running state for multi-pull pity tracking
      if (pull.rarity === 'legendary' || pull.rarity === 'mythic') {
        currentState = { ...currentState, pityCounter: { ...currentState.pityCounter, [bannerId]: 0 } };
      } else {
        currentState = {
          ...currentState,
          pityCounter: {
            ...currentState.pityCounter,
            [bannerId]: (currentState.pityCounter[bannerId] || 0) + 1,
          },
        };
      }
    }

    dispatch({ type: 'GACHA_PULL', bannerId, pulls });
    return pulls;
  }, [state.playerData.gacha]);

  const craftItem = useCallback((recipeId: string): boolean => {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;
    if (!canCraft(recipe, state.playerData.resources, state.playerData.craftingLevel)) return false;
    dispatch({ type: 'CRAFT_ITEM', recipeId });
    return true;
  }, [state.playerData.resources, state.playerData.craftingLevel]);

  const save = useCallback(() => {
    savePlayerData(state.playerData);
  }, [state.playerData]);

  return (
    <EchoesContext.Provider value={{
      state,
      dispatch,
      setPhase,
      setMode,
      setPlayerName,
      setParty,
      pullGacha,
      craftItem,
      save,
    }}>
      {children}
    </EchoesContext.Provider>
  );
}

export function useEchoes(): EchoesContextValue {
  const context = useContext(EchoesContext);
  if (!context) {
    throw new Error('useEchoes must be used within an EchoesProvider');
  }
  return context;
}
