'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import type { WorldData, StoryPoint, MovementState, Vector3 } from '@/types/world';
import type { PlayerStats, SkillCastEvent } from '@/types/skills';
import { PlayerCharacter, StoryMarker, Ground } from './WorldObjects';
import { SkillEffectsManager } from './SkillEffects';
import { usePlayerInput } from './usePlayerInput';
import { useSkills } from './useSkills';
import { sampleSkills, initialPlayerStats } from './skillData';
import PlayerHUD from './PlayerHUD';
import SkillBar from './SkillBar';
import dynamic from 'next/dynamic';
import styles from './World3D.module.css';

// Dynamically import CharacterDialog to avoid SSR issues
const CharacterDialog = dynamic(
  () => import('../character/CharacterDialog'),
  { ssr: false }
);

interface World3DProps {
  worldData: WorldData;
  onStoryComplete?: (storyId: string) => void;
}

export default function World3D({ worldData, onStoryComplete }: World3DProps) {
  // Player state
  const [playerPosition, setPlayerPosition] = useState<Vector3>(worldData.spawnPosition);
  const [playerRotation, setPlayerRotation] = useState(0);
  const [playerVelocity, setPlayerVelocity] = useState<Vector3>({ x: 0, y: 0, z: 0 });
  const [playerStats, setPlayerStats] = useState<PlayerStats>(initialPlayerStats);
  
  // Story interaction state
  const [activeStoryPoint, setActiveStoryPoint] = useState<StoryPoint | null>(null);
  const [completedStories, setCompletedStories] = useState<Set<string>>(new Set());
  const [nearbyStoryPoint, setNearbyStoryPoint] = useState<StoryPoint | null>(null);

  // Skill effects state
  const [activeSkillEffects, setActiveSkillEffects] = useState<SkillCastEvent[]>([]);

  // Input and skills
  const { getInputState, isMoving } = usePlayerInput();
  const { skillStates, castSkill, canCastSkill } = useSkills(sampleSkills, playerStats.mana);

  // Animation frame for game loop
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Get current zone's story points
  const currentZone = worldData.zones[0]; // For now, use first zone
  const storyPoints = currentZone.storyPoints;

  // Check if a story point is unlocked
  const isStoryUnlocked = useCallback(
    (point: StoryPoint): boolean => {
      if (!point.prerequisites || point.prerequisites.length === 0) {
        return true;
      }
      return point.prerequisites.every((prereq) => completedStories.has(prereq));
    },
    [completedStories]
  );

  // Find nearby story point
  const findNearbyStoryPoint = useCallback((): StoryPoint | null => {
    for (const point of storyPoints) {
      if (point.isCompleted || !isStoryUnlocked(point)) continue;

      const dx = point.position.x - playerPosition.x;
      const dz = point.position.z - playerPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= point.interactionRadius) {
        return point;
      }
    }
    return null;
  }, [storyPoints, playerPosition, isStoryUnlocked]);

  // Game loop - movement and physics
  useEffect(() => {
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateRef.current) / 1000, 0.1); // Cap at 100ms
      lastUpdateRef.current = now;

      const input = getInputState();

      // Calculate movement direction
      let moveX = 0;
      let moveZ = 0;

      if (input.forward) moveZ -= 1;
      if (input.backward) moveZ += 1;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;

      // Normalize diagonal movement
      const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (magnitude > 0) {
        moveX /= magnitude;
        moveZ /= magnitude;
      }

      // Apply movement
      const speed = playerStats.movementSpeed;
      const newVelocity = {
        x: moveX * speed,
        y: 0,
        z: moveZ * speed,
      };

      setPlayerVelocity(newVelocity);

      // Update position
      if (magnitude > 0) {
        setPlayerPosition((prev) => ({
          x: prev.x + newVelocity.x * deltaTime,
          y: prev.y,
          z: prev.z + newVelocity.z * deltaTime,
        }));

        // Update rotation to face movement direction
        const angle = Math.atan2(moveX, moveZ);
        setPlayerRotation(angle);
      }

      // Regenerate mana
      setPlayerStats((prev) => ({
        ...prev,
        mana: Math.min(prev.maxMana, prev.mana + prev.manaRegen * deltaTime),
      }));

      // Check for nearby story points
      const nearby = findNearbyStoryPoint();
      setNearbyStoryPoint(nearby);

      // Handle skill casting
      if (input.skillQ && !activeStoryPoint) {
        const event = castSkill('fireball', playerPosition);
        if (event) {
          setPlayerStats((prev) => ({
            ...prev,
            mana: prev.mana - event.skill.manaCost,
          }));
          setActiveSkillEffects((prev) => [...prev, event]);
        }
      }
      if (input.skillW && !activeStoryPoint) {
        const event = castSkill('ice_shield', playerPosition);
        if (event) {
          setPlayerStats((prev) => ({
            ...prev,
            mana: prev.mana - event.skill.manaCost,
          }));
          setActiveSkillEffects((prev) => [...prev, event]);
        }
      }
      if (input.skillE && !activeStoryPoint) {
        const event = castSkill('lightning_dash', playerPosition);
        if (event) {
          setPlayerStats((prev) => ({
            ...prev,
            mana: prev.mana - event.skill.manaCost,
          }));
          setActiveSkillEffects((prev) => [...prev, event]);
        }
      }
      if (input.skillR && !activeStoryPoint) {
        const event = castSkill('meteor_strike', playerPosition);
        if (event) {
          setPlayerStats((prev) => ({
            ...prev,
            mana: prev.mana - event.skill.manaCost,
          }));
          setActiveSkillEffects((prev) => [...prev, event]);
        }
      }

      // Handle interaction
      if (input.interact && nearby && !activeStoryPoint) {
        setActiveStoryPoint(nearby);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    getInputState,
    playerStats,
    playerPosition,
    findNearbyStoryPoint,
    castSkill,
    activeStoryPoint,
  ]);

  const handleStoryComplete = useCallback(() => {
    if (!activeStoryPoint) return;

    // Mark as completed
    setCompletedStories((prev) => new Set(prev).add(activeStoryPoint.id));
    onStoryComplete?.(activeStoryPoint.id);

    // Close dialog
    setActiveStoryPoint(null);
  }, [activeStoryPoint, onStoryComplete]);

  const handleSkillEffectComplete = useCallback((effectIndex: number) => {
    setActiveSkillEffects((prev) => prev.filter((_, i) => i !== effectIndex));
  }, []);

  return (
    <div className={styles.container}>
      {/* 3D World Canvas */}
      <Canvas
        className={styles.canvas}
        shadows
        camera={{ position: [0, 20, 20], fov: 50 }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[0, 10, 0]} intensity={0.3} color="#4ecdc4" />

          {/* Environment */}
          <Environment preset="night" />

          {/* Ground */}
          <Ground size={100} />

          {/* Player */}
          <PlayerCharacter
            position={playerPosition}
            rotation={playerRotation}
            isMoving={isMoving()}
          />

          {/* Story Points */}
          {storyPoints.map((point) => (
            <StoryMarker
              key={point.id}
              position={point.position}
              color={point.markerColor || '#f7b731'}
              type={point.markerType || 'quest'}
              isUnlocked={isStoryUnlocked(point)}
              isCompleted={completedStories.has(point.id)}
              isInRange={nearbyStoryPoint?.id === point.id}
            />
          ))}

          {/* Skill Effects */}
          <SkillEffectsManager
            activeEffects={activeSkillEffects}
            onEffectComplete={handleSkillEffectComplete}
          />

          {/* Camera Controls */}
          <OrbitControls
            target={[playerPosition.x, 0, playerPosition.z]}
            enablePan={false}
            minDistance={10}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>

      {/* HUD Overlays */}
      <PlayerHUD stats={playerStats} playerName="Adventurer" level={1} />
      <SkillBar skillStates={skillStates} currentMana={playerStats.mana} />

      {/* Interaction Prompt */}
      {nearbyStoryPoint && !activeStoryPoint && (
        <div className={styles.interactionPrompt}>
          <div className={styles.promptText}>
            Press <kbd>F</kbd> or <kbd>Space</kbd> to interact with
          </div>
          <div className={styles.promptTitle}>{nearbyStoryPoint.name}</div>
        </div>
      )}

      {/* Story Dialog */}
      {activeStoryPoint && (
        <div className={styles.dialogOverlay}>
          <CharacterDialog
            scene={activeStoryPoint.scene}
            onSceneComplete={handleStoryComplete}
            height="600px"
          />
        </div>
      )}

      {/* Controls Help */}
      <div className={styles.controlsHelp}>
        <div className={styles.helpItem}>
          <kbd>WASD</kbd> Move
        </div>
        <div className={styles.helpItem}>
          <kbd>Q/1 2 E/3 R/4</kbd> Skills
        </div>
        <div className={styles.helpItem}>
          <kbd>F/Space</kbd> Interact
        </div>
        <div className={styles.helpItem}>
          <kbd>Mouse Drag</kbd> Camera
        </div>
      </div>
    </div>
  );
}
