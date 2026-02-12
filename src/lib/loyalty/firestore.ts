/**
 * Firestore service for the loyalty system.
 * Reuses the Rhythmia Firebase project with anonymous auth.
 *
 * Collections:
 *   loyalty_polls/{pollId}       — poll documents (question, options, vote counts)
 *   loyalty_poll_votes/{odcId}   — individual vote records (prevents double-voting)
 *   loyalty_states/{playerId}    — per-player loyalty state sync
 */

import { db, auth } from '@/lib/rhythmia/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import type { Poll, PollVote, LoyaltyState } from './types';

// ===== Auth (shared with advancements, deduped via module cache) =====

let currentUser: User | null = null;
let authReady: Promise<User | null> | null = null;

export function initAuth(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);
  if (authReady) return authReady;

  authReady = new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        currentUser = user;
        unsubscribe();
        resolve(user);
      }
    });

    signInAnonymously(auth!).catch(() => {
      unsubscribe();
      resolve(null);
    });

    setTimeout(() => {
      unsubscribe();
      resolve(currentUser);
    }, 5000);
  });

  return authReady;
}

function getPlayerId(): string | null {
  return currentUser?.uid ?? null;
}

// ===== Polls =====

const POLLS_COLLECTION = 'loyalty_polls';
const VOTES_COLLECTION = 'loyalty_poll_votes';

/**
 * Fetch the currently active poll. Returns null if none found or Firestore unavailable.
 */
export async function fetchActivePoll(): Promise<Poll | null> {
  if (!db) return null;

  try {
    const pollsRef = collection(db, POLLS_COLLECTION);
    const q = query(pollsRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
      id: docSnap.id,
      question: data.question,
      options: data.options,
      votes: data.votes || new Array(data.options.length).fill(0),
      totalVotes: data.totalVotes || 0,
      active: data.active,
    };
  } catch (error) {
    console.error('[Loyalty] Failed to fetch active poll:', error);
    return null;
  }
}

/**
 * Check if the current user has already voted on a specific poll.
 */
export async function getUserVote(pollId: string): Promise<PollVote | null> {
  if (!db) return null;

  const playerId = getPlayerId();
  if (!playerId) return null;

  try {
    const voteDocId = `${pollId}_${playerId}`;
    const voteRef = doc(db, VOTES_COLLECTION, voteDocId);
    const voteSnap = await getDoc(voteRef);

    if (voteSnap.exists()) {
      const data = voteSnap.data();
      return {
        pollId: data.pollId,
        optionIndex: data.optionIndex,
      };
    }
    return null;
  } catch (error) {
    console.error('[Loyalty] Failed to check user vote:', error);
    return null;
  }
}

/**
 * Submit a vote. Atomically increments the vote count and records the user's vote.
 * Returns false if the user has already voted.
 */
export async function submitVote(pollId: string, optionIndex: number): Promise<boolean> {
  if (!db) return false;

  const playerId = getPlayerId();
  if (!playerId) return false;

  const voteDocId = `${pollId}_${playerId}`;

  try {
    // Check if already voted
    const voteRef = doc(db, VOTES_COLLECTION, voteDocId);
    const existingVote = await getDoc(voteRef);
    if (existingVote.exists()) return false;

    // Record vote
    await setDoc(voteRef, {
      pollId,
      playerId,
      optionIndex,
      votedAt: Timestamp.now(),
    });

    // Increment vote count on poll document
    const pollRef = doc(db, POLLS_COLLECTION, pollId);
    await updateDoc(pollRef, {
      [`votes.${optionIndex}`]: increment(1),
      totalVotes: increment(1),
    });

    return true;
  } catch (error) {
    console.error('[Loyalty] Failed to submit vote:', error);
    return false;
  }
}

/**
 * Seed a default poll if no active poll exists.
 * Called once during initialization; safe to call multiple times.
 */
export async function ensureActivePoll(): Promise<void> {
  if (!db) return;

  try {
    const existing = await fetchActivePoll();
    if (existing) return;

    const pollRef = doc(db, POLLS_COLLECTION, 'default_poll_1');
    await setDoc(pollRef, {
      question: {
        ja: '次のRHYTHMIAゲームモードは何がいい？',
        en: 'What should the next RHYTHMIA game mode be?',
      },
      options: [
        { ja: '協力モード（2v2チームバトル）', en: 'Co-op Mode (2v2 team battles)' },
        { ja: 'サバイバルモード（エンドレスウェーブ）', en: 'Survival Mode (endless waves)' },
        { ja: 'トーナメントモード（トーナメント戦）', en: 'Tournament Mode (bracket elimination)' },
        { ja: '禅モード（リラックス、プレッシャーなし）', en: 'Zen Mode (relaxed, no pressure)' },
      ],
      votes: [0, 0, 0, 0],
      totalVotes: 0,
      active: true,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    // Ignore — another client may have created it simultaneously
    console.error('[Loyalty] Seed poll failed (may already exist):', error);
  }
}

// ===== Loyalty State Sync =====

const STATES_COLLECTION = 'loyalty_states';

export async function syncLoyaltyToFirestore(state: LoyaltyState): Promise<void> {
  if (!db) return;

  const playerId = getPlayerId();
  if (!playerId) return;

  try {
    const docRef = doc(db, STATES_COLLECTION, playerId);
    await setDoc(docRef, {
      stats: state.stats,
      xp: state.xp,
      unlockedBadgeIds: state.unlockedBadgeIds,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('[Loyalty] Firestore sync failed:', error);
  }
}
