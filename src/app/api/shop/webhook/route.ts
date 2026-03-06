import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/shop/stripe';
import { getItemById } from '@/lib/shop/catalog';
import { grantPurchase } from '@/lib/shop/grants';
import { saveTransaction } from '@/lib/shop/firestore';
import type { Transaction } from '@/lib/shop/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('[Shop] Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const itemId = session.metadata?.itemId;

      if (!uid || !itemId) {
        console.error('[Shop] Webhook missing metadata:', { uid, itemId });
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const item = getItemById(itemId);
      if (!item) {
        console.error('[Shop] Webhook item not found:', itemId);
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      // Grant the purchased item
      const grants = await grantPurchase(uid, item);

      // Save completed transaction
      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tx: Transaction = {
        id: txId,
        uid,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        amountJpy: item.priceJpy,
        crystalsSpent: 0,
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
        status: 'completed',
        grantedItems: grants,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      await saveTransaction(tx);

      console.log(`[Shop] Purchase completed: uid=${uid} item=${itemId} grants=${JSON.stringify(grants)}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Shop] Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
