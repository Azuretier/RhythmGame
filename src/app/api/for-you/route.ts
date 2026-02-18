import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import forYouConfig from '../../../../for-you.config.json';

export const dynamic = 'force-dynamic';

interface ForYouRequest {
    locale: string;
    unlockedAdvancements: number;
    totalAdvancements: number;
    recentCategories?: string[];
}

interface ContentCard {
    type: 'tutorial' | 'video' | 'tip';
    id: string;
    title: string;
    description: string;
    tags?: string[];
    url?: string;
    thumbnail?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    source?: 'ai' | 'community';
}

async function fetchCommunityResources(locale: string): Promise<ContentCard[]> {
    try {
        const { getAdminApp } = await import('@/lib/rank-card/firebase-admin');
        const { getFirestore } = await import('firebase-admin/firestore');
        const app = getAdminApp();
        const db = getFirestore(app);

        const snapshot = await db
            .collection('wiki_pages')
            .where('forYouEligible', '==', true)
            .where('locale', '==', locale)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                type: (data.category === 'tutorial' ? 'tutorial' : data.category === 'tip' ? 'tip' : 'tutorial') as ContentCard['type'],
                id: `community-${doc.id}`,
                title: String(data.title || '').slice(0, 60),
                description: String(data.content || '').slice(0, 150).replace(/[#*`\n]/g, ' ').trim(),
                tags: Array.isArray(data.tags) ? data.tags.slice(0, 3) : [],
                difficulty: data.difficulty || 'beginner',
                source: 'community' as const,
            };
        });
    } catch (error) {
        console.error('Failed to fetch community resources:', error);
        return [];
    }
}

function resolveVideoUrl(url?: string): string {
    return url || forYouConfig.youtubeChannel;
}

export async function POST(request: NextRequest) {
    try {
        const body: ForYouRequest = await request.json();
        const { locale, unlockedAdvancements, totalAdvancements, recentCategories } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { cards: getFallbackContent(locale, unlockedAdvancements, totalAdvancements) },
                { status: 200 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const progressPercent = totalAdvancements > 0
            ? Math.round((unlockedAdvancements / totalAdvancements) * 100)
            : 0;

        const skillLevel = progressPercent < 15 ? 'beginner'
            : progressPercent < 50 ? 'intermediate'
            : 'advanced';

        const videoList = forYouConfig.videos.map(v => ({
            title: v.title,
            url: resolveVideoUrl(v.url),
        }));

        const prompt = `You are a content curator for RHYTHMIA, a rhythm x tetris fusion puzzle game. Generate personalized content recommendations for a player.

Player context:
- Skill level: ${skillLevel} (${unlockedAdvancements}/${totalAdvancements} advancements unlocked, ${progressPercent}%)
- Language: ${locale === 'ja' ? 'Japanese' : 'English'}
- Recent activity categories: ${recentCategories?.join(', ') || 'none'}

Available tutorials: ${JSON.stringify(forYouConfig.tutorials.map(t => t.topic))}
Available videos: ${JSON.stringify(videoList)}
YouTube channel: ${forYouConfig.youtubeChannel}

Generate exactly 6 content cards as a JSON array. Each card should have:
- "type": "tutorial" | "video" | "tip"
- "id": unique string identifier
- "title": compelling title (${locale === 'ja' ? 'in Japanese' : 'in English'}, max 40 chars)
- "description": brief helpful description (${locale === 'ja' ? 'in Japanese' : 'in English'}, max 100 chars)
- "tags": array of 1-3 short tags
- "difficulty": "beginner" | "intermediate" | "advanced"

Mix the types: include 2 tutorials, 2 videos, and 2 tips. Prioritize content that matches the player's skill level. For beginner players, focus on fundamentals. For advanced players, focus on competitive strategies and optimization.

For videos, reference actual video titles from the available list and include a "url" field with the video's URL from the list above. If a video has no specific URL, use the YouTube channel URL.

For tips, generate unique gameplay advice relevant to the player's progress level.

Return ONLY the JSON array, no markdown fencing, no explanation.`;

        // Run Gemini and community resource fetch in parallel
        const [result, communityCards] = await Promise.all([
            model.generateContent(prompt),
            fetchCommunityResources(locale),
        ]);

        const responseText = result.response.text().trim();

        let cards: ContentCard[];
        try {
            const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
            cards = JSON.parse(cleaned);
            if (!Array.isArray(cards)) throw new Error('Not an array');
            cards = cards.slice(0, 6).map((card) => ({
                type: card.type || 'tip',
                id: card.id || `gen-${Math.random().toString(36).slice(2, 8)}`,
                title: String(card.title || '').slice(0, 60),
                description: String(card.description || '').slice(0, 150),
                tags: Array.isArray(card.tags) ? card.tags.slice(0, 3) : [],
                difficulty: ['beginner', 'intermediate', 'advanced'].includes(card.difficulty ?? '') ? card.difficulty : 'beginner',
                url: card.url || undefined,
                source: 'ai' as const,
            }));
        } catch {
            cards = getFallbackContent(locale, unlockedAdvancements, totalAdvancements);
        }

        // Splice community resources into positions 2 and 5
        if (communityCards.length > 0 && cards.length >= 4) {
            cards.splice(2, 1, communityCards[0]);
            if (communityCards.length > 1 && cards.length >= 6) {
                cards.splice(5, 1, communityCards[1]);
            }
        }

        return NextResponse.json({ cards });
    } catch (error) {
        console.error('For You API error:', error);
        return NextResponse.json(
            { cards: getFallbackContent('en', 0, 1) },
            { status: 200 }
        );
    }
}

function getFallbackContent(locale: string, unlocked: number, total: number): ContentCard[] {
    const progressPercent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    const tier = progressPercent < 25 ? 'beginner' : 'advanced';
    const lang = locale === 'ja' ? 'ja' : 'en';

    const tierData = forYouConfig.fallback[tier] as Record<string, ContentCard[]>;
    const cards = tierData[lang] || tierData['en'];

    return cards.map((card) => ({
        ...card,
        url: card.type === 'video' ? resolveVideoUrl(card.url) : card.url,
    }));
}
