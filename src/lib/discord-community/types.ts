/**
 * Shared types for Discord Community Platform
 * Used by both web app and Discord bot
 */

export type RankTier = 'accordian' | 'arcadia' | 'apex' | 'legendary';

export interface UserProfile {
  id: string;
  username: string;
  discriminator?: string;
  avatarUrl: string;
  xp: number;
  level: number;
  rank: RankTier;
  rulesAgreed: boolean;
  roles: string[];
  joinedAt: string;
  lastXpGain?: string;
  messageCount?: number;
}

export interface ServerRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  category: 'activity' | 'interest' | 'contribution' | 'special';
  maxSelect?: number;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
}

export interface RuleProgress {
  ruleId: string;
  read: boolean;
  quizScore: number | null;
  quizAttempts: number;
  mastered: boolean;
}

export interface UserRuleProgress {
  userId: string;
  progress: RuleProgress[];
  totalPoints: number;
  currentRuleIndex: number;
  updatedAt: string;
}

export interface XPCooldown {
  userId: string;
  lastXpGain: string;
  expiresAt: string;
}

export interface GuildConfig {
  guildId: string;
  preMemberRoleId?: string;
  memberRoleId?: string;
  xpPerMessage: number;
  xpCooldownSeconds: number;
  levelUpChannelId?: string;
  rulesChannelId?: string;
}

// Utility functions
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function xpProgress(xp: number): { current: number; required: number; percentage: number } {
  const level = calculateLevel(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpInLevel = xp - currentLevelXp;
  const xpRequired = nextLevelXp - currentLevelXp;
  
  return {
    current: xpInLevel,
    required: xpRequired,
    percentage: (xpInLevel / xpRequired) * 100
  };
}

export function getRankForLevel(level: number): RankTier {
  if (level >= 50) return 'legendary';
  if (level >= 30) return 'apex';
  if (level >= 15) return 'arcadia';
  return 'accordian';
}

export function getRankColor(rank: RankTier): string {
  const colors = {
    accordian: 'oklch(0.65 0.15 60)',
    arcadia: 'oklch(0.70 0.02 250)',
    apex: 'oklch(0.75 0.18 90)',
    legendary: 'oklch(0.60 0.20 290)'
  };
  return colors[rank];
}
