import { createLocalStorageItem } from '@/lib/storage-utils';

const { get: getStoredUiThemeId, set: setStoredUiThemeId } = createLocalStorageItem('azuret_ui_theme');

export { getStoredUiThemeId, setStoredUiThemeId };
