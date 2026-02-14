/**
 * Changelog and update notification system
 * Tracks all PR changes from #104 onwards
 */

export interface PRUpdate {
  number: number;
  title: string;
  titleJa: string;
  category: 'feature' | 'enhancement' | 'fix' | 'refactor' | 'docs' | 'i18n';
  date: string;
  merged: boolean;
  description: string;
  descriptionJa: string;
  highlights?: string[];
  highlightsJa?: string[];
}

/**
 * Get localized PR content based on the current locale
 */
export function getLocalizedPRContent(update: PRUpdate, locale: string) {
  const isJapanese = locale === 'ja';
  return {
    title: isJapanese ? update.titleJa : update.title,
    description: isJapanese ? update.descriptionJa : update.description,
    highlights: isJapanese ? update.highlightsJa : update.highlights,
  };
}

export const PR_UPDATES: PRUpdate[] = [
  {
    number: 104,
    title: 'Add real-time online player count broadcast via Socket.IO',
    titleJa: 'Socket.IOによるリアルタイムオンラインプレイヤー数のブロードキャスト機能を追加',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Implemented real-time online player count tracking with Socket.IO broadcasting',
    descriptionJa: 'Socket.IOブロードキャストによるリアルタイムオンラインプレイヤー数追跡を実装',
    highlights: ['Real-time player count updates', 'Socket.IO integration'],
    highlightsJa: ['リアルタイムプレイヤー数更新', 'Socket.IO統合']
  },
  {
    number: 105,
    title: 'Improve multiplayer reconnection and timeout handling',
    titleJa: 'マルチプレイヤー再接続とタイムアウト処理を改善',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced reconnection with grace periods and exponential backoff',
    descriptionJa: '猶予期間と指数バックオフによる再接続を強化',
    highlights: ['60s grace period for reconnections', 'Exponential backoff retry logic', 'Session storage persistence'],
    highlightsJa: ['再接続用60秒猶予期間', '指数バックオフ再試行ロジック', 'セッションストレージ永続化']
  },
  {
    number: 106,
    title: 'Improve pixel-perfect rendering in game components',
    titleJa: 'ゲームコンポーネントのピクセルパーフェクトレンダリングを改善',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced visual fidelity with crisp pixel rendering',
    descriptionJa: '鮮明なピクセルレンダリングによる視覚品質を向上',
    highlights: ['Removed rounded corners', 'Added pixelated image rendering'],
    highlightsJa: ['角丸を削除', 'ピクセル化画像レンダリングを追加']
  },
  {
    number: 107,
    title: 'Add procedural block textures and refactor texture atlas system',
    titleJa: 'プロシージャルブロックテクスチャを追加し、テクスチャアトラスシステムをリファクタリング',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Implemented procedural texture generation for voxel blocks',
    descriptionJa: 'ボクセルブロック用のプロシージャルテクスチャ生成を実装',
    highlights: ['11 unique block textures', 'Pre-generated PNG assets', 'Minecraft-style aesthetics'],
    highlightsJa: ['11種類のユニークなブロックテクスチャ', '事前生成されたPNGアセット', 'Minecraftスタイルの美学']
  },
  {
    number: 108,
    title: 'initial commit - adding i18n',
    titleJa: '初回コミット - i18nを追加',
    category: 'i18n',
    date: '2026-02-07',
    merged: true,
    description: 'Initial internationalization setup with next-intl',
    descriptionJa: 'next-intlによる国際化の初期セットアップ',
    highlights: ['Japanese and English support', 'Locale routing'],
    highlightsJa: ['日本語と英語のサポート', 'ロケールルーティング']
  },
  {
    number: 109,
    title: 'Replace enemy HP system with terrain destruction mechanic',
    titleJa: '敵HPシステムを地形破壊メカニクスに置き換え',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Transformed enemy HP into dynamic terrain destruction gameplay',
    descriptionJa: '敵HPを動的な地形破壊ゲームプレイに変換',
    highlights: ['20x12 procedural terrain grid', 'Stage progression system', 'World cycling every 5 stages'],
    highlightsJa: ['20x12プロシージャル地形グリッド', 'ステージ進行システム', '5ステージごとにワールドサイクル']
  },
  {
    number: 110,
    title: 'Adding each translation for en and jp',
    titleJa: '英語と日本語の各翻訳を追加',
    category: 'i18n',
    date: '2026-02-07',
    merged: true,
    description: 'Added comprehensive translations for English and Japanese',
    descriptionJa: '英語と日本語の包括的な翻訳を追加',
    highlights: ['Complete translation coverage'],
    highlightsJa: ['完全な翻訳カバレッジ']
  },
  {
    number: 111,
    title: 'Fix grid layout sizing in multiplayer battle component',
    titleJa: 'マルチプレイヤーバトルコンポーネントのグリッドレイアウトサイズを修正',
    category: 'fix',
    date: '2026-02-07',
    merged: true,
    description: 'Fixed grid layout to use auto sizing for better alignment',
    descriptionJa: 'より良い配置のために自動サイズ調整を使用するようにグリッドレイアウトを修正',
    highlights: ['Pixel-perfect grid alignment'],
    highlightsJa: ['ピクセルパーフェクトなグリッド配置']
  },
  {
    number: 112,
    title: 'Add procedural textures and improve PBR rendering for voxel blocks',
    titleJa: 'プロシージャルテクスチャを追加し、ボクセルブロックのPBRレンダリングを改善',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced voxel rendering with PBR materials and procedural maps',
    descriptionJa: 'PBRマテリアルとプロシージャルマップによるボクセルレンダリングを強化',
    highlights: ['Detail, bump, and roughness maps', 'Enhanced lighting system', 'Ambient occlusion effects'],
    highlightsJa: ['ディテール、バンプ、ラフネスマップ', '強化されたライティングシステム', 'アンビエントオクルージョン効果']
  },
  {
    number: 113,
    title: 'Add rhythm-reactive VFX system with fever mode and beat animations',
    titleJa: 'フィーバーモードとビートアニメーション付きリズム反応VFXシステムを追加',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Introduced comprehensive rhythm-reactive visual effects system',
    descriptionJa: '包括的なリズム反応視覚効果システムを導入',
    highlights: ['8 effect types', 'Fever mode at combo 10+', 'Beat-synchronized animations', 'Rainbow hue cycling'],
    highlightsJa: ['8種類のエフェクト', 'コンボ10以上でフィーバーモード', 'ビート同期アニメーション', 'レインボー色相サイクル']
  },
  {
    number: 114,
    title: 'Add crafting system with floating items and world transitions',
    titleJa: 'フローティングアイテムとワールド遷移を含むクラフトシステムを追加',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Complete crafting and inventory system with visual effects',
    descriptionJa: 'ビジュアルエフェクト付きの完全なクラフトとインベントリシステム',
    highlights: ['6 item types', '6 weapon cards', 'Floating item animations', 'World transition effects'],
    highlightsJa: ['6種類のアイテム', '6種類の武器カード', 'フローティングアイテムアニメーション', 'ワールド遷移エフェクト']
  },
  {
    number: 115,
    title: 'Make RHYTHMIA version configurable and connect WebSocket at page load',
    titleJa: 'RHYTHMIAバージョンを設定可能にし、ページ読み込み時にWebSocket接続',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Made game version configurable via JSON config file',
    descriptionJa: 'JSON設定ファイル経由でゲームバージョンを設定可能に',
    highlights: ['rhythmia.config.json', 'Lobby WebSocket auto-connect', 'Accurate online player count'],
    highlightsJa: ['rhythmia.config.json', 'ロビーWebSocket自動接続', '正確なオンラインプレイヤー数']
  },
  {
    number: 116,
    title: 'Transform terrain destruction into tower defense game mode',
    titleJa: '地形破壊をタワーディフェンスゲームモードに変換',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Added tower defense mechanics with enemy spawning',
    descriptionJa: '敵スポーン付きのタワーディフェンスメカニクスを追加',
    highlights: ['Tower model at terrain center', 'Beat-synchronized enemy spawning', 'Line clears kill enemies'],
    highlightsJa: ['地形中央のタワーモデル', 'ビート同期敵スポーン', 'ライン消去で敵を倒す']
  },
  {
    number: 117,
    title: 'Memoize useRhythmVFX hook return value to prevent unnecessary re-renders',
    titleJa: 'useRhythmVFXフックの戻り値をメモ化して不要な再レンダリングを防止',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Performance optimization for VFX hook',
    descriptionJa: 'VFXフックのパフォーマンス最適化',
    highlights: ['Reduced unnecessary re-renders'],
    highlightsJa: ['不要な再レンダリングを削減']
  },
  {
    number: 118,
    title: 'Redesign beat indicator with cursor and dual target zones',
    titleJa: 'カーソルとデュアルターゲットゾーン付きビートインジケーターを再設計',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'New cursor-based beat timing indicator with on-beat zones',
    descriptionJa: 'オンビートゾーン付きの新しいカーソルベースのビートタイミングインジケーター',
    highlights: ['Left and right target zones', 'Gold glow on hit window', 'Improved timing feedback'],
    highlightsJa: ['左右のターゲットゾーン', 'ヒットウィンドウのゴールドグロー', '改善されたタイミングフィードバック']
  },
  {
    number: 119,
    title: 'Redesign item inventory UI with modern card layout and SVG icons',
    titleJa: 'モダンなカードレイアウトとSVGアイコンでアイテムインベントリUIを再設計',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Modern glass-morphism card design for inventory',
    descriptionJa: 'インベントリ用のモダンなグラスモーフィズムカードデザイン',
    highlights: ['Custom SVG icons', 'Typography-focused layout', 'Rarity-specific visual effects'],
    highlightsJa: ['カスタムSVGアイコン', 'タイポグラフィ重視のレイアウト', 'レアリティ別ビジュアルエフェクト']
  },
  {
    number: 121,
    title: 'Consolidate online count display in lobby status bar',
    titleJa: 'ロビーステータスバーのオンラインカウント表示を統合',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Unified online player count in lobby UI',
    descriptionJa: 'ロビーUIでオンラインプレイヤー数を統一',
    highlights: ['Single source of truth for player count'],
    highlightsJa: ['プレイヤー数の単一の信頼できるソース']
  },
  {
    number: 123,
    title: 'Add ranked matchmaking system with AI fallback',
    titleJa: 'AIフォールバック付きランクマッチメイキングシステムを追加',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Implemented competitive ranked matchmaking',
    descriptionJa: '競争的ランクマッチメイキングを実装',
    highlights: ['Tier-based ranking', 'Point-based matchmaking', 'Server-side queue with retry'],
    highlightsJa: ['ティアベースのランキング', 'ポイントベースのマッチメイキング', 'サーバーサイドキューとリトライ']
  },
  {
    number: 124,
    title: 'Refactor game layout to three-column symmetric design',
    titleJa: 'ゲームレイアウトを3カラム対称デザインにリファクタリング',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Redesigned game layout for better visual balance',
    descriptionJa: 'より良い視覚的バランスのためにゲームレイアウトを再設計',
    highlights: ['Three-column symmetry'],
    highlightsJa: ['3カラム対称']
  },
  {
    number: 125,
    title: 'Refactor RankedMatch to accept WebSocket as prop',
    titleJa: 'RankedMatchをリファクタリングしてWebSocketをpropとして受け取るように',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Improved WebSocket handling in ranked matches',
    descriptionJa: 'ランクマッチでのWebSocket処理を改善',
    highlights: ['Prop-based WebSocket injection'],
    highlightsJa: ['PropベースのWebSocketインジェクション']
  },
  {
    number: 126,
    title: 'Refactor terrain generation with fixed dimensions and top-down destruction',
    titleJa: '固定寸法とトップダウン破壊で地形生成をリファクタリング',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Improved terrain generation algorithm',
    descriptionJa: '地形生成アルゴリズムを改善',
    highlights: ['Fixed dimensions', 'Top-down destruction pattern'],
    highlightsJa: ['固定寸法', 'トップダウン破壊パターン']
  },
  {
    number: 128,
    title: 'Resolve merge conflict from main branch integration',
    titleJa: 'メインブランチ統合からのマージコンフリクトを解決',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Fixed merge conflicts from main branch',
    descriptionJa: 'メインブランチからのマージコンフリクトを修正',
    highlights: ['Branch synchronization'],
    highlightsJa: ['ブランチ同期']
  },
  {
    number: 129,
    title: 'Add achievements system with progression tracking and multiplayer unlock',
    titleJa: '進行状況追跡とマルチプレイヤーアンロック付き実績システムを追加',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Complete achievements system with 13+ advancement types',
    descriptionJa: '13以上の進捗タイプを含む完全な実績システム',
    highlights: ['Progression tracking', 'Firestore sync', 'Toast notifications', 'Battle arena gating'],
    highlightsJa: ['進行状況追跡', 'Firestore同期', 'トースト通知', 'バトルアリーナゲーティング']
  },
  {
    number: 130,
    title: 'Merge main branch advancements into ModelViewer feature branch',
    titleJa: 'メインブランチの進捗をModelViewer機能ブランチにマージ',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Branch merge for ModelViewer feature',
    descriptionJa: 'ModelViewer機能のブランチマージ',
    highlights: ['Feature branch synchronization'],
    highlightsJa: ['機能ブランチ同期']
  },
  {
    number: 131,
    title: 'Resolve merge conflicts with main branch',
    titleJa: 'メインブランチとのマージコンフリクトを解決',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Resolved merge conflicts',
    descriptionJa: 'マージコンフリクトを解決',
    highlights: ['Conflict resolution'],
    highlightsJa: ['コンフリクト解決']
  },
  {
    number: 132,
    title: 'Add notification center for advancement unlocks',
    titleJa: '進捗アンロック用の通知センターを追加',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Notification center UI for tracking achievements',
    descriptionJa: '実績追跡用の通知センターUI',
    highlights: ['Bell icon with badge', 'Dropdown notification list', 'Mark as read functionality'],
    highlightsJa: ['バッジ付きベルアイコン', 'ドロップダウン通知リスト', '既読マーク機能']
  },
  {
    number: 133,
    title: 'Add world-themed terrain colors and fix vanilla mode terrain generation',
    titleJa: 'ワールドテーマの地形カラーを追加し、バニラモードの地形生成を修正',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Enhanced terrain visuals with world-specific colors',
    descriptionJa: 'ワールド固有のカラーで地形ビジュアルを強化',
    highlights: ['World-themed color palettes', 'Fixed vanilla mode'],
    highlightsJa: ['ワールドテーマのカラーパレット', 'バニラモード修正']
  },
  {
    number: 134,
    title: 'Upgrade React Three Fiber ecosystem and fix React 19 type incompatibilities',
    titleJa: 'React Three Fiberエコシステムをアップグレードし、React 19型の非互換性を修正',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Upgraded 3D rendering libraries and fixed type issues',
    descriptionJa: '3Dレンダリングライブラリをアップグレードし、型の問題を修正',
    highlights: ['React Three Fiber upgrade', 'React 19 compatibility'],
    highlightsJa: ['React Three Fiberアップグレード', 'React 19互換性']
  },
  {
    number: 135,
    title: 'Add tower defense mechanics with turret, bullets, and impact effects',
    titleJa: 'タレット、弾丸、衝撃エフェクト付きタワーディフェンスメカニクスを追加',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Expanded tower defense with turrets and projectiles',
    descriptionJa: 'タレットと発射体でタワーディフェンスを拡張',
    highlights: ['Turret system', 'Bullet mechanics', 'Impact visual effects'],
    highlightsJa: ['タレットシステム', '弾丸メカニクス', '衝撃ビジュアルエフェクト']
  },
  {
    number: 136,
    title: 'Enhance bullet visuals and improve tower defense gameplay speed',
    titleJa: '弾丸ビジュアルを強化し、タワーディフェンスゲームプレイスピードを改善',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Improved tower defense gameplay and visuals',
    descriptionJa: 'タワーディフェンスゲームプレイとビジュアルを改善',
    highlights: ['Enhanced bullet graphics', 'Faster gameplay'],
    highlightsJa: ['強化された弾丸グラフィック', 'より速いゲームプレイ']
  },
  {
    number: 139,
    title: 'Add advancement system with live notifications to Rhythmia game',
    titleJa: 'Rhythmiaゲームにライブ通知付き進捗システムを追加',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Integrated advancement system into main game',
    descriptionJa: 'メインゲームに進捗システムを統合',
    highlights: ['Live unlock notifications', 'Game integration'],
    highlightsJa: ['ライブアンロック通知', 'ゲーム統合']
  },
  {
    number: 140,
    title: 'Redesign ModelViewer with dark theme and improved styling',
    titleJa: 'ダークテーマと改善されたスタイリングでModelViewerを再設計',
    category: 'enhancement',
    date: '2026-02-09',
    merged: true,
    description: 'Visual overhaul for 3D model viewer',
    descriptionJa: '3Dモデルビューアーのビジュアル刷新',
    highlights: ['Dark theme', 'Modern styling'],
    highlightsJa: ['ダークテーマ', 'モダンスタイリング']
  },
  {
    number: 141,
    title: 'Refactor pause menu with theme selector and notifications',
    titleJa: 'テーマセレクターと通知付きポーズメニューをリファクタリング',
    category: 'refactor',
    date: '2026-02-09',
    merged: true,
    description: 'Enhanced pause menu with new features',
    descriptionJa: '新機能付きの強化されたポーズメニュー',
    highlights: ['Theme selector', 'Notification integration'],
    highlightsJa: ['テーマセレクター', '通知統合']
  },
  {
    number: 142,
    title: 'Add Discord community link to header',
    titleJa: 'ヘッダーにDiscordコミュニティリンクを追加',
    category: 'feature',
    date: '2026-02-09',
    merged: true,
    description: 'Added Discord community navigation link',
    descriptionJa: 'Discordコミュニティナビゲーションリンクを追加',
    highlights: ['Discord integration'],
    highlightsJa: ['Discord統合']
  },
  {
    number: 144,
    title: 'Add SEO files and implement grid-based enemy movement system',
    titleJa: 'SEOファイルを追加し、グリッドベースの敵移動システムを実装',
    category: 'feature',
    date: '2026-02-10',
    merged: true,
    description: 'SEO improvements and enemy AI enhancement',
    descriptionJa: 'SEO改善と敵AIの強化',
    highlights: ['SEO metadata', 'Grid-based pathfinding'],
    highlightsJa: ['SEOメタデータ', 'グリッドベースのパスファインディング']
  },
  {
    number: 146,
    title: 'Update CLAUDE.md with i18n, ranked, advancements, and deployment details',
    titleJa: 'CLAUDE.mdをi18n、ランク、進捗、デプロイメント詳細で更新',
    category: 'docs',
    date: '2026-02-10',
    merged: true,
    description: 'Comprehensive documentation update',
    descriptionJa: '包括的なドキュメント更新',
    highlights: ['Architecture documentation', 'Feature documentation'],
    highlightsJa: ['アーキテクチャドキュメント', '機能ドキュメント']
  },
  {
    number: 148,
    title: 'Add world progression system with visual indicators',
    titleJa: 'ビジュアルインジケーター付きワールド進行システムを追加',
    category: 'feature',
    date: '2026-02-10',
    merged: true,
    description: 'World progression tracking with UI indicators',
    descriptionJa: 'UIインジケーター付きワールド進行追跡',
    highlights: ['Visual progress indicators', 'World tracking'],
    highlightsJa: ['ビジュアル進行インジケーター', 'ワールド追跡']
  },
  {
    number: 177,
    title: 'Add Wiki and redesigned Updates pages with comprehensive game documentation',
    titleJa: 'Wikiと再設計されたアップデートページを包括的なゲームドキュメントと共に追加',
    category: 'feature',
    date: '2026-02-12',
    merged: true,
    description: 'Added comprehensive wiki system and redesigned updates page with full documentation',
    descriptionJa: '包括的なWikiシステムと完全なドキュメント付きの再設計されたアップデートページを追加',
    highlights: ['Wiki page with game documentation', 'Redesigned updates page', 'Comprehensive PR tracking system', 'Update notification system'],
    highlightsJa: ['ゲームドキュメント付きWikiページ', '再設計されたアップデートページ', '包括的なPR追跡システム', '更新通知システム']
  }
];

/**
 * Get updates categorized by type
 */
export function getUpdatesByCategory() {
  const categories = new Map<string, PRUpdate[]>();
  
  for (const update of PR_UPDATES) {
    if (!categories.has(update.category)) {
      categories.set(update.category, []);
    }
    categories.get(update.category)!.push(update);
  }
  
  return categories;
}

/**
 * Get recent updates (last N merged PRs)
 */
export function getRecentUpdates(count: number = 10): PRUpdate[] {
  return PR_UPDATES
    .filter(pr => pr.merged)
    .sort((a, b) => b.number - a.number)
    .slice(0, count);
}

/**
 * Get updates by date range
 */
export function getUpdatesByDateRange(startDate: string, endDate?: string): PRUpdate[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  return PR_UPDATES.filter(pr => {
    const prDate = new Date(pr.date);
    return prDate >= start && prDate <= end && pr.merged;
  });
}

/**
 * Get update statistics
 */
export function getUpdateStats() {
  const merged = PR_UPDATES.filter(pr => pr.merged);
  const categories = getUpdatesByCategory();
  
  // Sort by date to ensure correct date range calculation
  const sortedByDate = [...merged].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return {
    total: PR_UPDATES.length,
    merged: merged.length,
    byCategory: {
      feature: categories.get('feature')?.length || 0,
      enhancement: categories.get('enhancement')?.length || 0,
      fix: categories.get('fix')?.length || 0,
      refactor: categories.get('refactor')?.length || 0,
      docs: categories.get('docs')?.length || 0,
      i18n: categories.get('i18n')?.length || 0,
    },
    dateRange: {
      start: sortedByDate[0]?.date || '',
      end: sortedByDate[sortedByDate.length - 1]?.date || '',
    }
  };
}
