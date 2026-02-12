# Release Management

This document describes the release process and tag management for azuretier.net.

## Current Status

- **Latest Tag**: v0.0.3 (created 2026-02-10)
- **Current HEAD**: Contains PR #189 (Multi-Language Support)
- **Next Release**: v0.0.4 (pending)

## Changes Since v0.0.3

### PR #189: Multi-Language Support (Merged 2026-02-12)

**Key Changes:**
- Added Spanish (`messages/es.json`), French (`messages/fr.json`), and Thai (`messages/th.json`) translation files
- Each translation file contains 357 keys covering:
  - All game UI elements
  - Achievement system
  - Loyalty system
  - Arena features
- Updated `src/i18n/routing.ts` to support 5 languages total:
  - Japanese (default, no prefix)
  - English (`/en`)
  - Thai (`/th`)
  - Spanish (`/es`)
  - French (`/fr`)
- Fixed canonical URL generation in `src/app/[locale]/layout.tsx`
- Added hreflang alternate links for all supported languages

**Impact:**
- Expanded international accessibility
- Improved SEO with proper locale handling
- Enhanced user experience for non-English/Japanese speakers

## Creating v0.0.4 Release

### Option 1: Using the Helper Script

```bash
./create-release.sh
```

This script will:
1. Show commits since v0.0.3
2. List merged PRs
3. Display the proposed tag message
4. Provide commands to create and push the tag

### Option 2: Manual Tagging

```bash
# Create an annotated tag
git tag -a v0.0.4 -m "v0.0.4: Multi-Language Support Update
⋰ :globe_with_meridians: Multi-Language: Added Spanish, French, and Thai language support
   (多言語対応：スペイン語、フランス語、タイ語のサポートを追加)
⋰ :page_facing_up: Translations: Complete translation files with 357 keys for all game features
   (翻訳：全ゲーム機能の357キーを含む完全な翻訳ファイル)
⋰ :link: SEO Enhancement: Fixed canonical URL handling and added hreflang alternate links
   (SEO改善：正規URLの処理を修正し、hreflang代替リンクを追加)
⋰ :gear: Routing Update: Extended locale routing to support 5 languages total
   (ルーティング更新：合計5言語をサポートするようロケールルーティングを拡張)

See CHANGELOG.md for full details."

# Push the tag to remote
git push origin v0.0.4
```

### Option 3: Using GitHub Releases

1. Go to https://github.com/Azuretier/azuretier.net/releases/new
2. Choose tag: `v0.0.4`
3. Target: `main` branch (or commit `2018d7c6`)
4. Release title: `v0.0.4: Multi-Language Support Update`
5. Description: Copy from the tag message above or CHANGELOG.md
6. Publish release

## Tag Message Format

Tags follow this format:
```
vX.Y.Z: <Release Name>
⋰ :<emoji>: <Feature Category>: <Description>
   (<Japanese Description>)
[repeat for each major feature]

See CHANGELOG.md for full details.
```

## Best Practices

1. **Never modify existing tags** - Tags should be immutable once published
2. **Always use annotated tags** (`git tag -a`) for releases
3. **Include bilingual descriptions** - Japanese and English for accessibility
4. **Update CHANGELOG.md** before creating a new tag
5. **Tag from main branch** - Ensure all changes are merged to main first
6. **Follow semantic versioning** - Use v0.0.Z for pre-release updates

## Version History

- **v0.0.2**: Initial release with core functionality
- **v0.0.3**: Defense, World & Economy Update (2026-02-10)
  - Tower Defense system
  - Shop + Inventory
  - Voxel Generation
  - Advancements system
  - Gameplay improvements
  - Networking enhancements
- **v0.0.4**: Multi-Language Support Update (pending)
  - Spanish, French, and Thai translations
  - SEO improvements
  - Locale routing enhancements

## Troubleshooting

### If a tag needs to be moved (not recommended)

```bash
# Delete local tag
git tag -d v0.0.X

# Delete remote tag
git push origin :refs/tags/v0.0.X

# Create new tag
git tag -a v0.0.X -m "message"

# Push new tag
git push origin v0.0.X
```

**Note**: This should only be done for tags that haven't been widely distributed, as it can cause issues for other users.

## References

- [CHANGELOG.md](./CHANGELOG.md) - Detailed change history
- [Semantic Versioning](https://semver.org/)
- [Git Tagging Best Practices](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
