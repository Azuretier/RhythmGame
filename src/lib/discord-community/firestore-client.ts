/**
 * Client-side Firestore service for Discord Community
 * Used in Next.js web application (browser context)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, UserRuleProgress, XPCooldown, GuildConfig } from './types';
import { calculateLevel, getRankForLevel } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_DISCORD_FIREBASE_APP_ID,
};

// Singleton pattern to prevent re-initialization
let app;
try {
  app = getApp('discord-community');
} catch (error) {
  app = initializeApp(firebaseConfig, 'discord-community');
}

const db = getFirestore(app);

export class DiscordFirestoreService {
  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'discord-users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
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
      const docRef = doc(db, 'discord-users', userId);
      
      // Calculate level and rank if XP is provided
      if (profile.xp !== undefined) {
        profile.level = calculateLevel(profile.xp);
        profile.rank = getRankForLevel(profile.level);
      }
      
      await setDoc(docRef, profile, { merge: true });
    } catch (error) {
      console.error('Error setting user profile:', error);
      throw error;
    }
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, 'discord-users', profile.id);
      
      // Ensure level and rank are calculated
      profile.level = calculateLevel(profile.xp);
      profile.rank = getRankForLevel(profile.level);
      
      await setDoc(docRef, profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'discord-users', userId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Rule Progress Operations
  async getUserRuleProgress(userId: string): Promise<UserRuleProgress | null> {
    try {
      const docRef = doc(db, 'discord-rule-progress', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
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
      const docRef = doc(db, 'discord-rule-progress', progress.userId);
      progress.updatedAt = new Date().toISOString();
      await setDoc(docRef, progress, { merge: true });
    } catch (error) {
      console.error('Error setting user rule progress:', error);
      throw error;
    }
  }

  // XP Cooldown Operations
  async checkXPCooldown(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'discord-xp-cooldowns', userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
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
      
      const docRef = doc(db, 'discord-xp-cooldowns', userId);
      await setDoc(docRef, cooldown);
    } catch (error) {
      console.error('Error setting XP cooldown:', error);
      throw error;
    }
  }

  // Guild Config Operations
  async getGuildConfig(guildId: string): Promise<GuildConfig | null> {
    try {
      const docRef = doc(db, 'discord-guild-configs', guildId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
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
      const docRef = doc(db, 'discord-guild-configs', config.guildId);
      await setDoc(docRef, config, { merge: true });
    } catch (error) {
      console.error('Error setting guild config:', error);
      throw error;
    }
  }

  // Leaderboard Operations
  async getLeaderboard(limit: number = 10): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'discord-users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      
      // Sort by XP (descending) in client since Firestore doesn't have orderBy in this query
      return users.sort((a, b) => b.xp - a.xp).slice(0, limit);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Utility
  getProfileUrl(userId: string, baseUrl: string = ''): string {
    return `${baseUrl}/azure-community/${userId}`;
  }
}

// Singleton instance
export const discordFirestore = new DiscordFirestoreService();
