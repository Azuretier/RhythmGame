/**
 * Server-side Firestore service for Discord Bot
 * Uses Firebase Admin SDK for server-side operations
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { UserProfile, UserRuleProgress, XPCooldown, GuildConfig } from '../types/discord-community';
import { calculateLevel, getRankForLevel } from '../types/discord-community';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    });
    
    return adminApp;
  } catch (error) {
    throw new Error(`Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = getAdminApp();
  adminDb = getFirestore(app);
  
  return adminDb;
}

export class DiscordFirestoreAdminService {
  private db: Firestore;

  constructor() {
    this.db = getAdminDb();
  }

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = this.db.collection('discord-users').doc(userId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async setUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = this.db.collection('discord-users').doc(userId);
      
      // Calculate level and rank if XP is provided
      if (profile.xp !== undefined) {
        profile.level = calculateLevel(profile.xp);
        profile.rank = getRankForLevel(profile.level);
      }
      
      await docRef.set(profile, { merge: true });
    } catch (error) {
      console.error('Error setting user profile:', error);
      throw error;
    }
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const docRef = this.db.collection('discord-users').doc(profile.id);
      
      // Ensure level and rank are calculated
      profile.level = calculateLevel(profile.xp);
      profile.rank = getRankForLevel(profile.level);
      
      await docRef.set(profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const docRef = this.db.collection('discord-users').doc(userId);
      await docRef.delete();
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  async getAllUserIds(): Promise<string[]> {
    try {
      const snapshot = await this.db.collection('discord-users').get();
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error fetching all user IDs:', error);
      return [];
    }
  }

  // Rule Progress Operations
  async getUserRuleProgress(userId: string): Promise<UserRuleProgress | null> {
    try {
      const docRef = this.db.collection('discord-rule-progress').doc(userId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        return docSnap.data() as UserRuleProgress;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user rule progress:', error);
      return null;
    }
  }

  async setUserRuleProgress(progress: UserRuleProgress): Promise<void> {
    try {
      const docRef = this.db.collection('discord-rule-progress').doc(progress.userId);
      progress.updatedAt = new Date().toISOString();
      await docRef.set(progress, { merge: true });
    } catch (error) {
      console.error('Error setting user rule progress:', error);
      throw error;
    }
  }

  // XP Cooldown Operations
  async checkXPCooldown(userId: string): Promise<boolean> {
    try {
      const docRef = this.db.collection('discord-xp-cooldowns').doc(userId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        return false; // No cooldown
      }
      
      const cooldown = docSnap.data() as XPCooldown;
      const expiresAt = new Date(cooldown.expiresAt);
      
      // Check if cooldown has expired
      return expiresAt > new Date();
    } catch (error) {
      console.error('Error checking XP cooldown:', error);
      return false;
    }
  }

  async setXPCooldown(userId: string, cooldownSeconds: number): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + cooldownSeconds * 1000);
      
      const cooldown: XPCooldown = {
        userId,
        lastXpGain: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      
      const docRef = this.db.collection('discord-xp-cooldowns').doc(userId);
      await docRef.set(cooldown);
    } catch (error) {
      console.error('Error setting XP cooldown:', error);
      throw error;
    }
  }

  // Guild Config Operations
  async getGuildConfig(guildId: string): Promise<GuildConfig | null> {
    try {
      const docRef = this.db.collection('discord-guild-configs').doc(guildId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        return docSnap.data() as GuildConfig;
      }
      return null;
    } catch (error) {
      console.error('Error fetching guild config:', error);
      return null;
    }
  }

  async setGuildConfig(config: GuildConfig): Promise<void> {
    try {
      const docRef = this.db.collection('discord-guild-configs').doc(config.guildId);
      await docRef.set(config, { merge: true });
    } catch (error) {
      console.error('Error setting guild config:', error);
      throw error;
    }
  }

  // Leaderboard Operations
  async getLeaderboard(limit: number = 10): Promise<UserProfile[]> {
    try {
      const snapshot = await this.db.collection('discord-users')
        .orderBy('xp', 'desc')
        .limit(limit)
        .get();
      
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Utility
  getProfileUrl(userId: string, baseUrl: string = process.env.WEBAPP_URL || 'https://azuret.me'): string {
    return `${baseUrl}/azure-community/${userId}`;
  }
}

// Singleton instance
export const discordFirestoreAdmin = new DiscordFirestoreAdminService();
