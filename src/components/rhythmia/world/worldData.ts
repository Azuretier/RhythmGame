import type { WorldData } from '@/types/world';
import { sampleStory } from '../character/storyData';

/** Sample world with story interaction points */
export const sampleWorld: WorldData = {
  title: 'Rhythmia World',
  spawnPosition: { x: 0, y: 0, z: 0 },
  zones: [
    {
      id: 'starting_village',
      name: 'Starting Village',
      description: 'A peaceful village where your journey begins.',
      bounds: {
        minX: -30,
        maxX: 30,
        minZ: -30,
        maxZ: 30,
      },
      music: '/music/village.mp3',
      weather: 'clear',
      storyPoints: [
        {
          id: 'intro_npc',
          name: 'Mysterious Traveler',
          position: { x: 10, y: 0, z: 10 },
          scene: sampleStory.scenes[0],
          interactionRadius: 3,
          isCompleted: false,
          isUnlocked: true,
          markerType: 'npc',
          markerColor: '#4ecdc4',
        },
        {
          id: 'village_elder',
          name: 'Village Elder',
          position: { x: -10, y: 0, z: 15 },
          scene: sampleStory.scenes[1],
          interactionRadius: 3,
          isCompleted: false,
          isUnlocked: true,
          prerequisites: [],
          markerType: 'quest',
          markerColor: '#f7b731',
        },
        {
          id: 'training_grounds',
          name: 'Training Grounds',
          position: { x: 0, y: 0, z: -15 },
          scene: {
            id: 'training_intro',
            characterName: 'Trainer',
            lines: [
              {
                speaker: 'Trainer',
                text: 'Welcome to the training grounds! Here you will learn to master your abilities.',
                animation: 'wave',
                expression: 'smile',
              },
              {
                speaker: 'Trainer',
                text: 'Use Q, W, E, R keys to cast your skills. Watch your mana and cooldowns!',
                animation: 'talking',
                expression: 'neutral',
              },
              {
                speaker: 'Trainer',
                text: 'Movement is controlled with WASD keys. Navigate the world and seek out story points!',
                animation: 'happy',
                expression: 'smile',
              },
            ],
          },
          interactionRadius: 4,
          isCompleted: false,
          isUnlocked: true,
          markerType: 'lore',
          markerColor: '#ee5a6f',
        },
        {
          id: 'secret_shrine',
          name: 'Ancient Shrine',
          position: { x: 20, y: 0, z: -20 },
          scene: {
            id: 'shrine_discovery',
            characterName: 'Spirit',
            lines: [
              {
                speaker: 'Ancient Spirit',
                text: 'You have discovered the Ancient Shrine. Few have made it this far...',
                animation: 'surprised',
                expression: 'surprised',
              },
              {
                speaker: 'Ancient Spirit',
                text: 'This sacred place holds great power. Use it wisely.',
                animation: 'thinking',
                expression: 'thinking',
              },
            ],
          },
          interactionRadius: 3,
          isCompleted: false,
          isUnlocked: false,
          prerequisites: ['intro_npc', 'village_elder'],
          markerType: 'checkpoint',
          markerColor: '#9b59b6',
        },
      ],
    },
    {
      id: 'forest_path',
      name: 'Mystic Forest',
      description: 'A dense forest filled with ancient magic.',
      bounds: {
        minX: 30,
        maxX: 80,
        minZ: -30,
        maxZ: 30,
      },
      music: '/music/forest.mp3',
      weather: 'fog',
      storyPoints: [
        {
          id: 'forest_guardian',
          name: 'Forest Guardian',
          position: { x: 50, y: 0, z: 0 },
          scene: {
            id: 'guardian_encounter',
            characterName: 'Guardian',
            lines: [
              {
                speaker: 'Forest Guardian',
                text: 'Halt! Who dares trespass in the sacred forest?',
                animation: 'surprised',
                expression: 'angry',
              },
              {
                speaker: 'Forest Guardian',
                text: 'Prove your worth in combat, or turn back now!',
                animation: 'talking',
                expression: 'angry',
              },
            ],
          },
          interactionRadius: 5,
          isCompleted: false,
          isUnlocked: false,
          prerequisites: ['training_grounds'],
          markerType: 'boss',
          markerColor: '#e74c3c',
        },
      ],
    },
  ],
};
