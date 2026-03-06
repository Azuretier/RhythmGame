import { db } from '@/lib/rhythmia/firebase';
import { doc, runTransaction, Timestamp, arrayUnion, increment } from 'firebase/firestore';
import type { ShopItem, PurchaseGrant } from './types';

const PURCHASES_COLLECTION = 'player_purchases';

export async function grantPurchase(uid: string, item: ShopItem): Promise<PurchaseGrant[]> {
  if (!db) throw new Error('Firestore not initialized');

  const grants: PurchaseGrant[] = [];
  const playerRef = doc(db, PURCHASES_COLLECTION, uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef);

    // Initialize if player doc doesn't exist
    if (!snap.exists()) {
      tx.set(playerRef, {
        uid,
        premiumCurrency: 0,
        ownedSkinIds: [],
        battlePassActive: false,
        inventorySlots: 0,
        totalSpentJpy: 0,
        transactionCount: 0,
        createdAt: Timestamp.now(),
      });
    }

    switch (item.category) {
      case 'crystal_pack': {
        const crystals = item.crystalsGranted || 0;
        tx.update(playerRef, {
          premiumCurrency: increment(crystals),
          totalSpentJpy: increment(item.priceJpy),
          transactionCount: increment(1),
          lastPurchaseAt: Timestamp.now(),
        });
        grants.push({ type: 'crystals', value: crystals, quantity: crystals });
        break;
      }

      case 'premium_skin': {
        const skinId = item.skinId;
        if (!skinId) throw new Error(`Item ${item.id} has no skinId`);

        const data = snap.exists() ? snap.data() : null;
        const ownedSkins: string[] = data?.ownedSkinIds ?? [];
        if (ownedSkins.includes(skinId)) {
          throw new Error(`Player already owns skin: ${skinId}`);
        }

        tx.update(playerRef, {
          ownedSkinIds: arrayUnion(skinId),
          transactionCount: increment(1),
          lastPurchaseAt: Timestamp.now(),
        });
        grants.push({ type: 'skin', value: skinId, quantity: 1 });
        break;
      }

      case 'battle_pass': {
        tx.update(playerRef, {
          battlePassActive: true,
          totalSpentJpy: increment(item.priceJpy),
          transactionCount: increment(1),
          lastPurchaseAt: Timestamp.now(),
        });
        grants.push({ type: 'battle_pass', value: 'active', quantity: 1 });
        break;
      }

      case 'inventory_expansion': {
        const slots = item.inventorySlots || 10;
        tx.update(playerRef, {
          inventorySlots: increment(slots),
          transactionCount: increment(1),
          lastPurchaseAt: Timestamp.now(),
        });
        grants.push({ type: 'inventory_slots', value: slots, quantity: slots });
        break;
      }
    }
  });

  return grants;
}
