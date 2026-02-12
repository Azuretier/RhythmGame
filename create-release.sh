#!/bin/bash
# Release Helper Script
# This script helps create git tags with properly formatted release notes

# Get the latest tag (sorted by version)
LATEST_TAG=$(git tag --sort=-version:refname | head -1)
if [ -z "$LATEST_TAG" ]; then
    LATEST_TAG="v0.0.2"
fi
echo "Latest tag: $LATEST_TAG"

# Determine next version
if [ "$LATEST_TAG" == "v0.0.3" ]; then
    NEXT_TAG="v0.0.4"
elif [ "$LATEST_TAG" == "v0.0.2" ]; then
    NEXT_TAG="v0.0.3"
else
    echo "Please manually specify the next tag version"
    exit 1
fi

echo "Next tag will be: $NEXT_TAG"

# Get commits since last tag
echo ""
echo "Commits since $LATEST_TAG:"
git log $LATEST_TAG..HEAD --oneline

# Get PRs merged since last tag
echo ""
echo "Pull Requests merged since $LATEST_TAG:"
git log $LATEST_TAG..HEAD --merges --format="%s" | grep "Merge pull request"

# For v0.0.4, use this message
if [ "$NEXT_TAG" == "v0.0.4" ]; then
    TAG_MESSAGE="v0.0.4: Multi-Language Support Update
⋰ :globe_with_meridians: Multi-Language: Added Spanish, French, and Thai language support
   (多言語対応：スペイン語、フランス語、タイ語のサポートを追加)
⋰ :page_facing_up: Translations: Complete translation files with 357 keys for all game features
   (翻訳：全ゲーム機能の357キーを含む完全な翻訳ファイル)
⋰ :link: SEO Enhancement: Fixed canonical URL handling and added hreflang alternate links
   (SEO改善：正規URLの処理を修正し、hreflang代替リンクを追加)
⋰ :gear: Routing Update: Extended locale routing to support 5 languages total
   (ルーティング更新：合計5言語をサポートするようロケールルーティングを拡張)

See CHANGELOG.md for full details and previous release notes."

    echo ""
    echo "=========================================="
    echo "Proposed tag message for $NEXT_TAG:"
    echo "=========================================="
    echo "$TAG_MESSAGE"
    echo "=========================================="
    echo ""
    echo "To create this tag, run:"
    echo "  git tag -a $NEXT_TAG -m \"\$TAG_MESSAGE\""
    echo "  git push origin $NEXT_TAG"
fi
