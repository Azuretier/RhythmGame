/**
 * OpenClaw Shop Rotator — Biweekly featured shop rotation.
 *
 * 1. Selects 3-4 premium skins to feature as "limited" for 2 weeks
 * 2. Applies a small discount (10-20% crystal reduction)
 * 3. Updates Firestore shop_featured collection
 * 4. Generates a shop announcement post
 * 5. Queues the announcement for the next posting window
 *
 * Usage: npx ts-node --project tsconfig.server.json scripts/openclaw-shop-rotator.ts
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_RHYTHMIA_FIREBASE_APP_ID,
};

function getDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopItem {
  id: string;
  name: string;
  category: string;
  priceCrystals: number;
  rarity: number;
}

interface FeaturedItem {
  itemId: string;
  name: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  featuredAt: Timestamp;
  expiresAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Fetch available premium items
// ---------------------------------------------------------------------------

async function getPremiumItems(): Promise<ShopItem[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'shop_items'), where('rarity', '>=', 3)),
  );

  const items: ShopItem[] = [];
  snap.forEach((d) => {
    items.push({ id: d.id, ...d.data() } as ShopItem);
  });

  return items;
}

// ---------------------------------------------------------------------------
// Select featured items
// ---------------------------------------------------------------------------

function selectFeatured(items: ShopItem[], count: number): ShopItem[] {
  // Shuffle with Fisher-Yates and pick the first `count`
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function applyDiscount(price: number): { discounted: number; percent: number } {
  // Random 10-20% discount
  const percent = 10 + Math.floor(Math.random() * 11);
  const discounted = Math.round(price * (1 - percent / 100));
  return { discounted, percent };
}

// ---------------------------------------------------------------------------
// Update Firestore
// ---------------------------------------------------------------------------

async function clearPreviousFeatured() {
  const db = getDb();
  const snap = await getDocs(collection(db, 'shop_featured'));
  const deletes: Promise<void>[] = [];
  snap.forEach((d) => {
    deletes.push(deleteDoc(doc(db, 'shop_featured', d.id)));
  });
  await Promise.all(deletes);
  console.log(`[OpenClaw] Cleared ${deletes.length} previous featured items`);
}

async function writeFeatured(items: FeaturedItem[]) {
  const db = getDb();
  for (const item of items) {
    await setDoc(doc(db, 'shop_featured', item.itemId), item);
  }
  console.log(`[OpenClaw] Wrote ${items.length} featured items`);
}

// ---------------------------------------------------------------------------
// Queue announcement
// ---------------------------------------------------------------------------

async function queueAnnouncement(items: FeaturedItem[]) {
  const db = getDb();

  const itemList = items
    .map((i) => `${i.name} (-${i.discountPercent}%)`)
    .join(', ');

  const content = `New featured items in the shop! ${itemList} — available for a limited time. Check them out now!`;

  await addDoc(collection(db, 'marketing_queue'), {
    content,
    topic: 'shop_rotation',
    platform: 'x',
    status: 'pending',
    source: 'openclaw-shop-rotator',
    scheduledAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // 1h from now
    createdAt: Timestamp.now(),
  });

  console.log('[OpenClaw] Shop announcement queued');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[OpenClaw] Starting biweekly shop rotation...');

  const premiumItems = await getPremiumItems();
  if (premiumItems.length === 0) {
    console.log('[OpenClaw] No premium items found, skipping rotation');
    return;
  }

  const featureCount = Math.min(premiumItems.length, 3 + Math.floor(Math.random() * 2)); // 3-4
  const selected = selectFeatured(premiumItems, featureCount);

  const now = Timestamp.now();
  const twoWeeksLater = Timestamp.fromDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );

  const featured: FeaturedItem[] = selected.map((item) => {
    const { discounted, percent } = applyDiscount(item.priceCrystals);
    return {
      itemId: item.id,
      name: item.name,
      category: item.category,
      originalPrice: item.priceCrystals,
      discountedPrice: discounted,
      discountPercent: percent,
      featuredAt: now,
      expiresAt: twoWeeksLater,
    };
  });

  await clearPreviousFeatured();
  await writeFeatured(featured);
  await queueAnnouncement(featured);

  console.log('[OpenClaw] Shop rotation complete');
}

main().catch((err) => {
  console.error('[OpenClaw] Fatal error:', err);
  process.exit(1);
});
