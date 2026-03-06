import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function isAuthorised(request: NextRequest): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  const adminKey = process.env.ADMIN_API_KEY;
  return !!adminKey && token === adminKey;
}

// ---------------------------------------------------------------------------
// Firestore helpers (lazy-loaded to avoid pulling firebase into every cold start)
// ---------------------------------------------------------------------------

async function getDb() {
  const { db } = await import('@/lib/rhythmia/firebase');
  return db;
}

async function countDocsSince(
  collectionName: string,
  timestampField: string,
  since: Date,
) {
  const db = await getDb();
  if (!db) return 0;

  const { collection, query, where, getDocs, Timestamp } = await import(
    'firebase/firestore'
  );

  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where(timestampField, '>=', Timestamp.fromDate(since)),
    ),
  );
  return snap.size;
}

async function sumFieldSince(
  collectionName: string,
  timestampField: string,
  sumField: string,
  since: Date,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const { collection, query, where, getDocs, Timestamp } = await import(
    'firebase/firestore'
  );

  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where(timestampField, '>=', Timestamp.fromDate(since)),
    ),
  );

  let total = 0;
  snap.forEach((doc) => {
    const val = doc.data()[sumField];
    if (typeof val === 'number') total += val;
  });
  return total;
}

async function dailyAggregation(
  collectionName: string,
  timestampField: string,
  valueField: string | null,
  since: Date,
): Promise<{ date: string; value: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const { collection, query, where, getDocs, Timestamp } = await import(
    'firebase/firestore'
  );

  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where(timestampField, '>=', Timestamp.fromDate(since)),
    ),
  );

  const buckets = new Map<string, number>();
  snap.forEach((doc) => {
    const data = doc.data();
    const ts = data[timestampField]?.toDate?.();
    if (!ts) return;
    const dateKey = ts.toISOString().slice(0, 10);
    const val = valueField ? (typeof data[valueField] === 'number' ? data[valueField] : 0) : 1;
    buckets.set(dateKey, (buckets.get(dateKey) ?? 0) + val);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

// ---------------------------------------------------------------------------
// Funnel aggregation
// ---------------------------------------------------------------------------

async function getFunnelData(since: Date) {
  const db = await getDb();
  const steps = [
    'landing',
    'profile_created',
    'first_game',
    'shop_viewed',
    'checkout_started',
    'purchase_completed',
  ];

  if (!db) {
    return steps.map((step) => ({ step, count: 0, conversionRate: 0 }));
  }

  const { collection, query, where, getDocs, Timestamp } = await import(
    'firebase/firestore'
  );

  const snap = await getDocs(
    query(
      collection(db, 'funnel_events'),
      where('timestamp', '>=', Timestamp.fromDate(since)),
    ),
  );

  const counts = new Map<string, number>();
  for (const s of steps) counts.set(s, 0);

  snap.forEach((doc) => {
    const step = doc.data().step as string;
    if (counts.has(step)) counts.set(step, (counts.get(step) ?? 0) + 1);
  });

  return steps.map((step, i) => {
    const count = counts.get(step) ?? 0;
    const prev = i === 0 ? count : (counts.get(steps[i - 1]) ?? 0);
    return {
      step,
      count,
      conversionRate: prev > 0 ? Math.round((count / prev) * 100) : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Marketing stats
// ---------------------------------------------------------------------------

async function getMarketingStats(since: Date) {
  const db = await getDb();
  if (!db) {
    return { postsThisWeek: 0, totalImpressions: 0, engagementRate: 0 };
  }

  const { collection, query, where, getDocs, Timestamp } = await import(
    'firebase/firestore'
  );

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const postsSnap = await getDocs(
    query(
      collection(db, 'marketing_queue'),
      where('scheduledAt', '>=', Timestamp.fromDate(weekAgo)),
    ),
  );
  const postsThisWeek = postsSnap.size;

  const allSnap = await getDocs(
    query(
      collection(db, 'marketing_queue'),
      where('scheduledAt', '>=', Timestamp.fromDate(since)),
    ),
  );

  let totalImpressions = 0;
  let totalEngagement = 0;
  let postCount = 0;
  allSnap.forEach((doc) => {
    const d = doc.data();
    if (typeof d.impressions === 'number') totalImpressions += d.impressions;
    if (typeof d.engagementRate === 'number') {
      totalEngagement += d.engagementRate;
      postCount++;
    }
  });

  return {
    postsThisWeek,
    totalImpressions,
    engagementRate: postCount > 0 ? totalEngagement / postCount : 0,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rangeParam = request.nextUrl.searchParams.get('range') ?? '7d';
  const days = RANGE_DAYS[rangeParam] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [
      revenueTotal,
      dailyRevenue,
      dau,
      wau,
      mau,
      totalPlayers,
      dailySignups,
      funnel,
      marketing,
    ] = await Promise.all([
      sumFieldSince('shop_transactions', 'createdAt', 'amountJpy', since),
      dailyAggregation('shop_transactions', 'createdAt', 'amountJpy', since),
      countDocsSince('user_sync', 'lastActive', new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      countDocsSince('user_sync', 'lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      countDocsSince('user_sync', 'lastActive', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      countDocsSince('user_sync', 'createdAt', new Date(0)),
      dailyAggregation('user_sync', 'createdAt', null, since),
      getFunnelData(since),
      getMarketingStats(since),
    ]);

    return NextResponse.json({
      revenue: {
        total: revenueTotal,
        daily: dailyRevenue.map((d) => ({ date: d.date, amount: d.value })),
      },
      players: {
        dau,
        wau,
        mau,
        total: totalPlayers,
        dailySignups: dailySignups.map((d) => ({ date: d.date, count: d.value })),
      },
      funnel,
      marketing,
    });
  } catch (error) {
    console.error('[Analytics] Dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
