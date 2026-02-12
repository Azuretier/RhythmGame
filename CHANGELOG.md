# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Multi-Language Support**: Added Spanish, French, and Thai language translations (PR #189)
  - Complete translation files with 357 keys covering all game UI, achievements, loyalty system, and arena features
  - Extended locale routing to support 5 languages total: Japanese (default), English, Thai, Spanish, and French
  - Updated language switcher with new language options

### Fixed
- **SEO Enhancement**: Fixed canonical URL handling to properly use current locale instead of defaulting to English (PR #189)
- **Metadata**: Added hreflang alternate links for all five supported languages for improved SEO (PR #189)

## [v0.0.3] - 2026-02-10

### Added
- **Tower Defense**: Mana system, turrets, and projectile mechanics
  - (タワーディフェンス：マナシステム、タレット、物理弾を発射する仕組みの実装)
- **Shop + Inventory**: Equipment purchase system and collectibles
  - (ショップ・インベントリ：装備の購入とコレクション要素の追加)
- **Voxel Generation**: Terrain generation synced with stage progress
  - (Voxel地形生成：ステージの進行状況に同期した地形生成)
- **Advancements**: Achievement system with dedicated UI
  - (実績システム：アチーブメント概念の導入と専用UI)
- **Gameplay QoL**: 500ms Lock Delay and Pause Menu
  - (操作性の向上：500msの設置猶予設定とポーズメニューの追加)

### Improved
- **Networking**: WebSocket stability and Player count synchronization
  - (通信：WebSocketの安定化、オンライン人数の同期)

### Technical
- **React 19**: Migration to React 19
- **SEO**: SEO optimizations
- **Performance**: Performance improvements
  - (技術面：React 19への移行、SEO最適化、パフォーマンス改善)

## [v0.0.2] - Previous Release

Initial release with core multiplayer functionality.
