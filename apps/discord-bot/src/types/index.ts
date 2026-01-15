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
  lastMessageAt?: string;
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
  discordRoleId?: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
}

export interface XPGain {
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export interface BotConfig {
  preMemberRoleId: string;
  memberRoleId: string;
  xpPerMessage: number;
  xpCooldownSeconds: number;
  maxRolesPerUser: number;
}
