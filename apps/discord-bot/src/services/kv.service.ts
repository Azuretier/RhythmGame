import type { UserProfile } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('KVService');

export class KVService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.WEBAPP_URL || 'https://azuret.me';
    this.apiKey = process.env.WEBAPP_API_KEY || '';
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/kv/user-profile-${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      return await response.json() as UserProfile | null;
    } catch (error) {
      logger.error('Error fetching user profile', error);
      return null;
    }
  }

  async setUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/kv/user-profile-${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        throw new Error(`Failed to save profile: ${response.statusText}`);
      }

      logger.info(`Profile saved for user ${userId}`);
    } catch (error) {
      logger.error('Error saving user profile', error);
      throw error;
    }
  }

  async getAllUserIds(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/kv/keys?prefix=user-profile-`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch keys: ${response.statusText}`);
      }

      const keys = await response.json() as string[];
      return keys.map((key: string) => key.replace('user-profile-', ''));
    } catch (error) {
      logger.error('Error fetching user IDs', error);
      return [];
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/kv/user-profile-${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete profile: ${response.statusText}`);
      }

      logger.info(`Profile deleted for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting user profile', error);
      throw error;
    }
  }

  getProfileUrl(userId: string): string {
    return `${this.baseUrl}/azure-community/${userId}`;
  }
}

export const kvService = new KVService();
