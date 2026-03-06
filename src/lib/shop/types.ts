export type ShopItemCategory = 'crystal_pack' | 'battle_pass' | 'premium_skin' | 'inventory_expansion';

export interface ShopItem {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  category: ShopItemCategory;
  priceJpy: number; // 0 if purchased with crystals
  priceInCrystals: number; // 0 if purchased with JPY
  crystalsGranted?: number; // for crystal packs
  skinId?: string; // for premium skins
  inventorySlots?: number; // for inventory expansion
  imageUrl?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  isLimited?: boolean;
  availableUntil?: string;
  tags?: string[];
}

export interface Transaction {
  id: string;
  uid: string;
  itemId: string;
  itemName: string;
  category: ShopItemCategory;
  amountJpy: number;
  crystalsSpent: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  grantedItems: PurchaseGrant[];
  createdAt: string; // ISO string
  completedAt?: string;
}

export interface PurchaseGrant {
  type: 'crystals' | 'skin' | 'battle_pass' | 'inventory_slots';
  value: string | number; // skin ID or crystal count or slot count
  quantity: number;
}

export interface PlayerPurchaseState {
  uid: string;
  premiumCurrency: number; // Eternity Crystals balance
  ownedSkinIds: string[];
  battlePassActive: boolean;
  battlePassSeason?: string;
  inventorySlots: number; // extra slots purchased
  totalSpentJpy: number;
  transactionCount: number;
  lastPurchaseAt?: string;
}
