import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import { getTransactionHistory, getPlayerPurchaseState } from '@/lib/shop/firestore';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const check = rateLimiter.check(ip);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(check.retryAfterMs / 1000)) } },
      );
    }

    const uid = request.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limitCount = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100) : 50;

    const [transactions, purchaseState] = await Promise.all([
      getTransactionHistory(uid, limitCount),
      getPlayerPurchaseState(uid),
    ]);

    return NextResponse.json({
      transactions,
      purchaseState,
    });
  } catch (error) {
    console.error('[Shop] Purchases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
