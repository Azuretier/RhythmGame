/**
 * Firestore Room Service
 * Manages room persistence in Google Firestore
 */

import { Firestore } from 'firebase-admin/firestore';
import { RoomState, Player } from '@/types/multiplayer';

export interface FirestoreRoomDocument {
  name: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  status: 'open' | 'in_game';
  maxPlayers: number;
  hostId: string;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    joinedAt: number;
  }[];
}

export class FirestoreRoomService {
  private db: Firestore;
  private roomsCollection = 'rhythmia_rooms';
  private roomTTL = 3600000; // 1 hour in milliseconds

  constructor(firestore: Firestore) {
    this.db = firestore;
  }

  /**
   * Save or update a room in Firestore
   */
  async saveRoom(roomState: RoomState & { createdAt?: number; maxPlayers?: number }): Promise<void> {
    const now = Date.now();
    const doc: FirestoreRoomDocument = {
      name: roomState.name || `Room ${roomState.code}`,
      code: roomState.code,
      createdAt: roomState.createdAt || now,
      updatedAt: now,
      status: roomState.status === 'playing' ? 'in_game' : 'open',
      maxPlayers: roomState.maxPlayers || 8,
      hostId: roomState.hostId,
      players: roomState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.id === roomState.hostId,
        joinedAt: now,
      })),
    };

    await this.db
      .collection(this.roomsCollection)
      .doc(roomState.code)
      .set(doc, { merge: true });

    console.log(`Room ${roomState.code} saved to Firestore`);
  }

  /**
   * Get a room from Firestore
   */
  async getRoom(roomCode: string): Promise<FirestoreRoomDocument | null> {
    const doc = await this.db
      .collection(this.roomsCollection)
      .doc(roomCode)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as FirestoreRoomDocument;
  }

  /**
   * List all open rooms
   */
  async listOpenRooms(): Promise<FirestoreRoomDocument[]> {
    const snapshot = await this.db
      .collection(this.roomsCollection)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreRoomDocument);
  }

  /**
   * Delete a room from Firestore
   */
  async deleteRoom(roomCode: string): Promise<void> {
    await this.db.collection(this.roomsCollection).doc(roomCode).delete();
    console.log(`Room ${roomCode} deleted from Firestore`);
  }

  /**
   * Clean up stale rooms (older than TTL)
   */
  async cleanupStaleRooms(): Promise<number> {
    const cutoffTime = Date.now() - this.roomTTL;
    const snapshot = await this.db
      .collection(this.roomsCollection)
      .where('updatedAt', '<', cutoffTime)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    const count = snapshot.docs.length;
    
    if (count > 0) {
      console.log(`Cleaned up ${count} stale rooms from Firestore`);
    }
    
    return count;
  }

  /**
   * Update room status
   */
  async updateRoomStatus(
    roomCode: string,
    status: 'open' | 'in_game'
  ): Promise<void> {
    await this.db
      .collection(this.roomsCollection)
      .doc(roomCode)
      .update({
        status,
        updatedAt: Date.now(),
      });
  }
}
