import { db } from '@/lib/rhythmia/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import type { Transaction, PlayerPurchaseState } from './types';

const TRANSACTIONS_COLLECTION = 'shop_transactions';
const PURCHASES_COLLECTION = 'player_purchases';

export async function saveTransaction(tx: Transaction): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const ref = doc(db, TRANSACTIONS_COLLECTION, tx.id);
  await setDoc(ref, {
    ...tx,
    createdAt: Timestamp.fromDate(new Date(tx.createdAt)),
    completedAt: tx.completedAt ? Timestamp.fromDate(new Date(tx.completedAt)) : null,
  });
}

export async function getPlayerPurchaseState(uid: string): Promise<PlayerPurchaseState | null> {
  if (!db) throw new Error('Firestore not initialized');

  const ref = doc(db, PURCHASES_COLLECTION, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid: data.uid,
    premiumCurrency: data.premiumCurrency ?? 0,
    ownedSkinIds: data.ownedSkinIds ?? [],
    battlePassActive: data.battlePassActive ?? false,
    battlePassSeason: data.battlePassSeason,
    inventorySlots: data.inventorySlots ?? 0,
    totalSpentJpy: data.totalSpentJpy ?? 0,
    transactionCount: data.transactionCount ?? 0,
    lastPurchaseAt: data.lastPurchaseAt
      ? (data.lastPurchaseAt as Timestamp).toDate().toISOString()
      : undefined,
  };
}

export async function initializePlayerPurchaseState(uid: string): Promise<PlayerPurchaseState> {
  if (!db) throw new Error('Firestore not initialized');

  const state: PlayerPurchaseState = {
    uid,
    premiumCurrency: 0,
    ownedSkinIds: [],
    battlePassActive: false,
    inventorySlots: 0,
    totalSpentJpy: 0,
    transactionCount: 0,
  };

  const ref = doc(db, PURCHASES_COLLECTION, uid);
  await setDoc(ref, {
    ...state,
    createdAt: Timestamp.now(),
  });

  return state;
}

export async function getTransactionHistory(
  uid: string,
  limitCount = 50,
): Promise<Transaction[]> {
  if (!db) throw new Error('Firestore not initialized');

  const ref = collection(db, TRANSACTIONS_COLLECTION);
  const q = query(
    ref,
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      itemId: data.itemId,
      itemName: data.itemName,
      category: data.category,
      amountJpy: data.amountJpy,
      crystalsSpent: data.crystalsSpent,
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      status: data.status,
      grantedItems: data.grantedItems ?? [],
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
      completedAt: data.completedAt instanceof Timestamp
        ? data.completedAt.toDate().toISOString()
        : data.completedAt,
    } as Transaction;
  });
}

export async function updateTransactionStatus(
  txId: string,
  status: Transaction['status'],
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const ref = doc(db, TRANSACTIONS_COLLECTION, txId);
  await setDoc(ref, {
    status,
    ...(status === 'completed' ? { completedAt: Timestamp.now() } : {}),
  }, { merge: true });
}
