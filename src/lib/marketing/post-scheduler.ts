import { getAdminDb } from '@/lib/rank-card/firebase-admin';
import type { GeneratedPost } from './content-generator';

export interface ScheduledPost {
  id: string;
  post: GeneratedPost;
  status: 'pending' | 'posted' | 'failed';
  scheduledAt: string;
  postedAt?: string;
  targetPlatforms: ('x' | 'discord')[];
  error?: string;
  createdAt: string;
}

const COLLECTION = 'marketing_queue';

export async function queuePost(
  post: GeneratedPost,
  scheduledAt: string,
  platforms: ('x' | 'discord')[],
): Promise<string> {
  const db = getAdminDb();
  const docRef = db.collection(COLLECTION).doc();
  const now = new Date().toISOString();

  const data: Omit<ScheduledPost, 'id'> = {
    post,
    status: 'pending',
    scheduledAt,
    targetPlatforms: platforms,
    createdAt: now,
  };

  await docRef.set(data);
  console.log(`[Marketing] Queued post ${docRef.id} for ${scheduledAt}`);
  return docRef.id;
}

export async function getPendingPosts(): Promise<ScheduledPost[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .orderBy('scheduledAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledPost[];
}

export async function markAsPosted(postId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(postId).update({
    status: 'posted',
    postedAt: new Date().toISOString(),
  });
  console.log(`[Marketing] Marked post ${postId} as posted`);
}

export async function markAsFailed(postId: string, error: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(postId).update({
    status: 'failed',
    error,
  });
  console.error(`[Marketing] Marked post ${postId} as failed: ${error}`);
}

export async function getPostHistory(limitCount = 50): Promise<ScheduledPost[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledPost[];
}
