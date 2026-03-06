import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import { getItemById } from '@/lib/shop/catalog';
import { createCheckoutSession } from '@/lib/shop/stripe';
import { grantPurchase } from '@/lib/shop/grants';
import { saveTransaction, getPlayerPurchaseState, initializePlayerPurchaseState } from '@/lib/shop/firestore';
import { db } from '@/lib/rhythmia/firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import type { Transaction } from '@/lib/shop/types';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });

const checkoutSchema = z.object({
  itemId: z.string().min(1).max(100),
  uid: z.string().min(1).max(128),
  locale: z.string().max(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const check = rateLimiter.check(ip);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(check.retryAfterMs / 1000)) } },
      );
    }

    const rawBody = await request.json();
    const parsed = checkoutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }

    const { itemId, uid, locale = 'ja' } = parsed.data;

    const item = getItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check limited availability
    if (item.isLimited && item.availableUntil) {
      if (new Date(item.availableUntil) < new Date()) {
        return NextResponse.json({ error: 'Item is no longer available' }, { status: 410 });
      }
    }

    // ── Crystal purchase (no Stripe needed) ──
    if (item.priceJpy === 0 && item.priceInCrystals > 0) {
      return handleCrystalPurchase(uid, item, itemId);
    }

    // ── JPY purchase via Stripe ──
    const { sessionId, url } = await createCheckoutSession(item, uid, locale);

    // Save a pending transaction
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tx: Transaction = {
      id: txId,
      uid,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      amountJpy: item.priceJpy,
      crystalsSpent: 0,
      stripeSessionId: sessionId,
      status: 'pending',
      grantedItems: [],
      createdAt: new Date().toISOString(),
    };

    await saveTransaction(tx);

    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error('[Shop] Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCrystalPurchase(
  uid: string,
  item: ReturnType<typeof getItemById> & {},
  itemId: string,
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const playerRef = doc(db, 'player_purchases', uid);

  // Ensure player state exists
  let state = await getPlayerPurchaseState(uid);
  if (!state) {
    state = await initializePlayerPurchaseState(uid);
  }

  // Check sufficient crystals
  if (state.premiumCurrency < item.priceInCrystals) {
    return NextResponse.json(
      { error: 'Insufficient crystals', required: item.priceInCrystals, balance: state.premiumCurrency },
      { status: 402 },
    );
  }

  // Deduct crystals atomically, then grant
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef);
    const currentCrystals = snap.data()?.premiumCurrency ?? 0;

    if (currentCrystals < item.priceInCrystals) {
      throw new Error('Insufficient crystals');
    }

    tx.update(playerRef, {
      premiumCurrency: increment(-item.priceInCrystals),
    });
  });

  // Grant the purchased item
  const grants = await grantPurchase(uid, item);

  // Save transaction record
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const transaction: Transaction = {
    id: txId,
    uid,
    itemId,
    itemName: item.name,
    category: item.category,
    amountJpy: 0,
    crystalsSpent: item.priceInCrystals,
    status: 'completed',
    grantedItems: grants,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  await saveTransaction(transaction);

  return NextResponse.json({ success: true, grants, transactionId: txId });
}
