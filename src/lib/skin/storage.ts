import { createLocalStorageItem } from '@/lib/storage-utils';

const { get: getStoredSkinId, set: setStoredSkinId } = createLocalStorageItem('azuret_skin');

export { getStoredSkinId, setStoredSkinId };
