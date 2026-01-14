import type { UserProfile } from '../types/index.js';
import { calculateLevel, getRankForLevel } from '../utils/xp.js';
import { discordFirestoreAdmin } from './firestore.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('XPService');

export class XPService {
  private xpPerMessage: number = 10;
  private cooldownSeconds: number = 60;

  async addXP(userId: string, username: string, amount: number, _reason: string): Promise<{
    profile: UserProfile;
    leveledUp: boolean;
    oldLevel: number;
    rankChanged: boolean;
  }> {
    let profile = await discordFirestoreAdmin.getUserProfile(userId);
    
    if (!profile) {
      profile = this.createDefaultProfile(userId, username);
    }

    const oldLevel = profile.level;
    const oldRank = profile.rank;
    
    profile.xp += amount;
    profile.level = calculateLevel(profile.xp);
    profile.rank = getRankForLevel(profile.level);
    profile.lastXpGain = new Date().toISOString();
    profile.messageCount = (profile.messageCount || 0) + 1;

    await discordFirestoreAdmin.setUserProfile(userId, profile);

    const leveledUp = profile.level > oldLevel;
    const rankChanged = profile.rank !== oldRank;

    if (leveledUp) {
      logger.info(`User ${username} leveled up to level ${profile.level}`);
    }
    if (rankChanged) {
      logger.info(`User ${username} ranked up to ${profile.rank}`);
    }

    return { profile, leveledUp, oldLevel, rankChanged };
  }

  async canGainXP(userId: string): Promise<boolean> {
    return !(await discordFirestoreAdmin.checkXPCooldown(userId));
  }

  async setCooldown(userId: string): Promise<void> {
    await discordFirestoreAdmin.setXPCooldown(userId, this.cooldownSeconds);
  }

  async processMessageXP(userId: string, username: string): Promise<{
    gained: boolean;
    profile?: UserProfile;
    leveledUp?: boolean;
    rankChanged?: boolean;
  }> {
    if (!(await this.canGainXP(userId))) {
      return { gained: false };
    }

    await this.setCooldown(userId);
    
    const result = await this.addXP(userId, username, this.xpPerMessage, 'message');
    
    return {
      gained: true,
      profile: result.profile,
      leveledUp: result.leveledUp,
      rankChanged: result.rankChanged
    };
  }

  async getLeaderboard(limit: number = 10): Promise<UserProfile[]> {
    return await discordFirestoreAdmin.getLeaderboard(limit);
  }

  private createDefaultProfile(userId: string, username: string): UserProfile {
    return {
      id: userId,
      username,
      avatarUrl: `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`,
      xp: 0,
      level: 0,
      rank: 'accordian',
      rulesAgreed: false,
      roles: ['member'],
      joinedAt: new Date().toISOString(),
      messageCount: 0
    };
  }

  async setXP(userId: string, username: string, xp: number): Promise<UserProfile> {
    let profile = await discordFirestoreAdmin.getUserProfile(userId);
    
    if (!profile) {
      profile = this.createDefaultProfile(userId, username);
    }

    profile.xp = xp;
    profile.level = calculateLevel(xp);
    profile.rank = getRankForLevel(profile.level);

    await discordFirestoreAdmin.setUserProfile(userId, profile);
    
    return profile;
  }
}

export const xpService = new XPService();
