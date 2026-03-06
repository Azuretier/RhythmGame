import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import { SHOP_CATALOG } from '@/lib/shop/catalog';
import type { ShopItemCategory } from '@/lib/shop/types';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });

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

    // Group items by category
    const grouped: Record<ShopItemCategory, typeof SHOP_CATALOG> = {
      crystal_pack: [],
      battle_pass: [],
      premium_skin: [],
      inventory_expansion: [],
    };

    for (const item of SHOP_CATALOG) {
      grouped[item.category].push(item);
    }

    return NextResponse.json({ catalog: grouped });
  } catch (error) {
    console.error('[Shop] Catalog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
