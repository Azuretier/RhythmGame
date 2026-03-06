import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import { getAdminDb } from '@/lib/rank-card/firebase-admin';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } },
      );
    }

    const db = getAdminDb();
    const now = new Date();

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const usersRef = db.collection('user_sync');

    const [dauSnap, wauSnap, mauSnap, totalSnap] = await Promise.all([
      usersRef.where('lastSyncedAt', '>=', oneDayAgo).count().get(),
      usersRef.where('lastSyncedAt', '>=', sevenDaysAgo).count().get(),
      usersRef.where('lastSyncedAt', '>=', thirtyDaysAgo).count().get(),
      usersRef.count().get(),
    ]);

    const recentSignupsSnap = await usersRef
      .where('createdAt', '>=', sevenDaysAgo)
      .count()
      .get();

    const gameModes = [
      'Rhythmia',
      'Arena',
      'Tower Defense',
      'Minecraft Board',
      'Minecraft World',
      'Minecraft Switch',
      'Echoes of Eternity',
    ];

    return NextResponse.json({
      dau: dauSnap.data().count,
      wau: wauSnap.data().count,
      mau: mauSnap.data().count,
      totalPlayers: totalSnap.data().count,
      activeGameModes: gameModes,
      recentSignups: recentSignupsSnap.data().count,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[Marketing] Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
