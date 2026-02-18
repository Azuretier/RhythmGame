import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/rank-card/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { WIKI_ADMIN_EMAILS, generateSlug } from '@/lib/wiki/constants';

export const dynamic = 'force-dynamic';

const PAGES_COLLECTION = 'wiki_pages';
const SUBMISSIONS_COLLECTION = 'wiki_submissions';

async function verifyAdmin(request: NextRequest): Promise<{ email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email;
    if (!email) return null;

    if (!WIKI_ADMIN_EMAILS.includes(email.toLowerCase())) return null;
    return { email };
  } catch {
    return null;
  }
}

function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

/**
 * GET /api/wiki — List pending submissions (admin only)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(SUBMISSIONS_COLLECTION)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const submissions = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
      reviewedAt: d.data().reviewedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('[Wiki API] Failed to fetch submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/wiki — Approve or reject a submission (admin only)
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, submissionId, reviewNote } = body;

    if (!action || !submissionId) {
      return NextResponse.json({ error: 'Missing action or submissionId' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = getAdminDb();
    const submissionRef = db.collection(SUBMISSIONS_COLLECTION).doc(submissionId);
    const submissionSnap = await submissionRef.get();

    if (!submissionSnap.exists) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = submissionSnap.data()!;

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already reviewed' }, { status: 400 });
    }

    const now = Timestamp.now();

    if (action === 'reject') {
      await submissionRef.update({
        status: 'rejected',
        reviewedBy: admin.email,
        reviewNote: reviewNote || null,
        reviewedAt: now,
      });
      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // Approve: update submission status
    await submissionRef.update({
      status: 'approved',
      reviewedBy: admin.email,
      reviewNote: reviewNote || null,
      reviewedAt: now,
    });

    // For new_page and resource: publish to wiki_pages
    if (submission.type === 'new_page' || submission.type === 'resource') {
      const slug = generateSlug(submission.title);

      // Check slug uniqueness
      const existingSlug = await db
        .collection(PAGES_COLLECTION)
        .where('slug', '==', slug)
        .limit(1)
        .get();

      const finalSlug = existingSlug.empty ? slug : `${slug}-${Date.now().toString(36)}`;

      await db.collection(PAGES_COLLECTION).add({
        slug: finalSlug,
        title: submission.title,
        content: submission.content,
        category: submission.category,
        tags: submission.tags || [],
        locale: submission.locale || 'en',
        authorUid: submission.authorUid,
        authorName: submission.authorName,
        authorEmail: submission.authorEmail || null,
        forYouEligible: submission.type === 'resource',
        approvedBy: admin.email,
        approvedAt: now,
        createdAt: submission.createdAt || now,
        updatedAt: now,
        version: 1,
      });
    }

    // For edit_suggestion: just mark approved (admin reviews manually)

    return NextResponse.json({ success: true, action: 'approved' });
  } catch (error) {
    console.error('[Wiki API] Action failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
