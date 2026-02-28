// Client-side Firestore service for Minecraft World rooms
// Uses the Rhythmia Firebase project for room discovery/persistence

import { db } from '@/lib/rhythmia/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { MWFirestoreRoom } from '@/types/minecraft-world';

const COLLECTION = 'minecraft_world_rooms';
const ROOM_TTL = 3600000; // 1 hour

function getRoomsCollection() {
  if (!db) return null;
  return collection(db, COLLECTION);
}

export async function saveRoom(room: MWFirestoreRoom): Promise<void> {
  if (!db) return;
  const ref = doc(db, COLLECTION, room.code);
  await setDoc(ref, { ...room, updatedAt: Date.now() }, { merge: true });
}

export async function getRoom(roomCode: string): Promise<MWFirestoreRoom | null> {
  if (!db) return null;
  const ref = doc(db, COLLECTION, roomCode);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as MWFirestoreRoom) : null;
}

export async function listOpenRooms(): Promise<MWFirestoreRoom[]> {
  const col = getRoomsCollection();
  if (!col) return [];

  try {
    const q = query(
      col,
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MWFirestoreRoom);
  } catch {
    // Fallback if index not yet created: query without orderBy
    try {
      const q = query(col, where('status', '==', 'open'), limit(50));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as MWFirestoreRoom)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }
}

export async function updateRoomStatus(
  roomCode: string,
  status: MWFirestoreRoom['status'],
  playerCount?: number,
): Promise<void> {
  if (!db) return;
  const ref = doc(db, COLLECTION, roomCode);
  const update: Record<string, unknown> = { status, updatedAt: Date.now() };
  if (playerCount !== undefined) update.playerCount = playerCount;
  try {
    await updateDoc(ref, update);
  } catch {
    // Document may not exist yet
  }
}

export async function deleteRoom(roomCode: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, COLLECTION, roomCode);
  try {
    await deleteDoc(ref);
  } catch {
    // Ignore if not found
  }
}

export async function cleanupStaleRooms(): Promise<void> {
  const col = getRoomsCollection();
  if (!col) return;

  try {
    const cutoff = Date.now() - ROOM_TTL;
    const q = query(col, where('updatedAt', '<', cutoff), limit(100));
    const snap = await getDocs(q);
    const deletes = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
  } catch {
    // Ignore cleanup errors
  }
}
