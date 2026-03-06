import Stripe from 'stripe';
import type { ShopItem } from './types';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.error('[Shop] STRIPE_SECRET_KEY is not set');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export async function createCheckoutSession(
  item: ShopItem,
  uid: string,
  locale: string,
): Promise<{ sessionId: string; url: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  if (item.priceJpy <= 0) {
    throw new Error('Item does not have a JPY price');
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://azuretier.net';
  const localePrefix = locale && locale !== 'ja' ? `/${locale}` : '';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: locale === 'ja' ? item.nameJa : item.name,
            description: locale === 'ja' ? item.descriptionJa : item.description,
          },
          unit_amount: item.priceJpy, // JPY has no decimals
        },
        quantity: 1,
      },
    ],
    metadata: {
      uid,
      itemId: item.id,
      category: item.category,
    },
    success_url: `${baseUrl}${localePrefix}?shop=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${localePrefix}?shop=cancelled`,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return { sessionId: session.id, url: session.url };
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
