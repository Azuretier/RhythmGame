/**
 * Client-side Firestore operations for wiki pages and submissions.
 * Uses the Rhythmia Firebase project with anonymous auth for player identification.
 */

import { db, auth } from '@/lib/rhythmia/firebase';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import type {
  WikiPage,
  WikiSubmission,
  SubmitNewPageData,
  SubmitEditSuggestionData,
  SubmitResourceData,
} from './types';
import { generateSlug } from './constants';

const PAGES_COLLECTION = 'wiki_pages';
const SUBMISSIONS_COLLECTION = 'wiki_submissions';

let currentUser: User | null = null;
let authReady: Promise<User | null> | null = null;

function initAuth(): Promise<User | null> {
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

// --- Read operations (public) ---

export async function fetchPublishedPages(locale?: string): Promise<WikiPage[]> {
  if (!db) return [];
  await initAuth();

  try {
    const col = collection(db, PAGES_COLLECTION);
    const constraints = locale
      ? [where('locale', '==', locale), orderBy('createdAt', 'desc'), limit(50)]
      : [orderBy('createdAt', 'desc'), limit(50)];
    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WikiPage));
  } catch (error) {
    console.error('[Wiki] Failed to fetch published pages:', error);
    return [];
  }
}

export async function fetchPageBySlug(slug: string): Promise<WikiPage | null> {
  if (!db) return null;
  await initAuth();

  try {
    const col = collection(db, PAGES_COLLECTION);
    const q = query(col, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as WikiPage;
  } catch (error) {
    console.error('[Wiki] Failed to fetch page by slug:', error);
    return null;
  }
}

export async function fetchPageById(id: string): Promise<WikiPage | null> {
  if (!db) return null;
  await initAuth();

  try {
    const docRef = doc(db, PAGES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as WikiPage;
  } catch (error) {
    console.error('[Wiki] Failed to fetch page by id:', error);
    return null;
  }
}

// --- Write operations (requires auth) ---

export async function submitNewPage(data: SubmitNewPageData): Promise<string> {
  if (!db) throw new Error('Database not available');
  await initAuth();

  const playerId = getPlayerId();
  if (!playerId) throw new Error('Not authenticated');

  const submission = {
    type: 'new_page' as const,
    targetPageId: null,
    targetStaticPage: null,
    title: data.title,
    content: data.content,
    description: '',
    category: data.category,
    tags: data.tags,
    difficulty: null,
    locale: data.locale,
    authorUid: playerId,
    authorName: data.authorName,
    authorEmail: data.authorEmail,
    status: 'pending' as const,
    reviewedBy: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: Timestamp.now(),
  };

  const col = collection(db, SUBMISSIONS_COLLECTION);
  const docRef = await addDoc(col, submission);
  return docRef.id;
}

export async function submitEditSuggestion(data: SubmitEditSuggestionData): Promise<string> {
  if (!db) throw new Error('Database not available');
  await initAuth();

  const playerId = getPlayerId();
  if (!playerId) throw new Error('Not authenticated');

  const submission = {
    type: 'edit_suggestion' as const,
    targetPageId: data.targetPageId,
    targetStaticPage: data.targetStaticPage,
    title: data.title,
    content: data.content,
    description: '',
    category: data.category,
    tags: data.tags,
    difficulty: null,
    locale: data.locale,
    authorUid: playerId,
    authorName: data.authorName,
    authorEmail: data.authorEmail,
    status: 'pending' as const,
    reviewedBy: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: Timestamp.now(),
  };

  const col = collection(db, SUBMISSIONS_COLLECTION);
  const docRef = await addDoc(col, submission);
  return docRef.id;
}

export async function submitResource(data: SubmitResourceData): Promise<string> {
  if (!db) throw new Error('Database not available');
  await initAuth();

  const playerId = getPlayerId();
  if (!playerId) throw new Error('Not authenticated');

  const submission = {
    type: 'resource' as const,
    targetPageId: null,
    targetStaticPage: null,
    title: data.title,
    content: data.content,
    description: data.description,
    category: data.category,
    tags: data.tags,
    difficulty: data.difficulty,
    locale: data.locale,
    authorUid: playerId,
    authorName: data.authorName,
    authorEmail: data.authorEmail,
    status: 'pending' as const,
    reviewedBy: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: Timestamp.now(),
  };

  const col = collection(db, SUBMISSIONS_COLLECTION);
  const docRef = await addDoc(col, submission);
  return docRef.id;
}

export async function fetchMySubmissions(): Promise<WikiSubmission[]> {
  if (!db) return [];
  await initAuth();

  const playerId = getPlayerId();
  if (!playerId) return [];

  try {
    const col = collection(db, SUBMISSIONS_COLLECTION);
    const q = query(
      col,
      where('authorUid', '==', playerId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WikiSubmission));
  } catch (error) {
    console.error('[Wiki] Failed to fetch my submissions:', error);
    return [];
  }
}

// --- Slug helper for new pages ---

export async function generateUniqueSlug(title: string): Promise<string> {
  let slug = generateSlug(title);
  const existing = await fetchPageBySlug(slug);
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  return slug;
}
