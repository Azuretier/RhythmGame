import { GoogleGenerativeAI } from '@google/generative-ai';

export type PostType =
  | 'devlog'
  | 'shop_announcement'
  | 'season_announcement'
  | 'community_highlight'
  | 'tip_of_the_day'
  | 'weekly_recap';

export interface GeneratedPost {
  type: PostType;
  textJa: string;
  textEn: string;
  hashtags: string[];
  suggestedMedia?: string;
  scheduledFor?: string;
}

const BRAND_SYSTEM_PROMPT = `You are the social media voice for azuretier.net, an indie gaming platform.

Brand voice:
- Friendly, enthusiastic game-dev tone
- Mix Japanese and English naturally when appropriate
- Use relevant hashtags: #azuretier #インディーゲーム #gamedev #indiegame #rhythmia
- Keep each language version under 280 characters (including hashtags)

The platform features 7 game modes:
1. Rhythmia — rhythm x tetris fusion puzzle game (core)
2. Arena — 9-player multiplayer arena
3. Tower Defense — multiplayer tower defense with send-enemies mechanic
4. Minecraft Board Game — board game with Minecraft-inspired crafting
5. Minecraft World — voxel multiplayer world
6. Minecraft Switch Edition — full survival clone
7. Echoes of Eternity — RPG mode

Default language is Japanese. The site is at azuretier.net.
Birthday: 2024-10-16.

Return JSON only, no markdown fencing.`;

const FALLBACK_TEMPLATES: Record<PostType, GeneratedPost> = {
  devlog: {
    type: 'devlog',
    textJa: '開発進捗をお届け！azuretier.netは日々進化中。新機能やバグ修正に取り組んでいます。お楽しみに！ #azuretier #インディーゲーム #gamedev',
    textEn: 'Dev update! azuretier.net keeps evolving. Working on new features and fixes. Stay tuned! #azuretier #gamedev #indiegame',
    hashtags: ['#azuretier', '#インディーゲーム', '#gamedev', '#indiegame'],
    suggestedMedia: 'Screenshot of recent code changes or new UI',
  },
  shop_announcement: {
    type: 'shop_announcement',
    textJa: 'ショップに新アイテムが登場！チェックしてみてね。azuretier.net #azuretier #ゲーム #shop',
    textEn: 'New items in the shop! Check them out at azuretier.net #azuretier #gaming #shop',
    hashtags: ['#azuretier', '#ゲーム', '#shop'],
    suggestedMedia: 'Shop item preview image',
  },
  season_announcement: {
    type: 'season_announcement',
    textJa: '新シーズン開始！今期も一緒に楽しもう。azuretier.net #azuretier #newseason #rhythmia',
    textEn: 'New season is here! Let\'s play together. azuretier.net #azuretier #newseason #rhythmia',
    hashtags: ['#azuretier', '#newseason', '#rhythmia'],
    suggestedMedia: 'Season banner or key visual',
  },
  community_highlight: {
    type: 'community_highlight',
    textJa: 'コミュニティの皆さん、いつもありがとう！一緒にazuretier.netを盛り上げよう。 #azuretier #community #ゲームコミュニティ',
    textEn: 'Shoutout to our amazing community! Thanks for being part of azuretier.net. #azuretier #community #gaming',
    hashtags: ['#azuretier', '#community', '#gaming'],
    suggestedMedia: 'Community screenshot or fan art',
  },
  tip_of_the_day: {
    type: 'tip_of_the_day',
    textJa: 'RHYTHMIAのコツ：リズムに合わせてテトリスピースを配置すると、コンボボーナスが増えるよ！ #azuretier #rhythmia #ゲームのコツ',
    textEn: 'RHYTHMIA tip: Place tetris pieces on the beat for combo bonuses! #azuretier #rhythmia #gamingtips',
    hashtags: ['#azuretier', '#rhythmia', '#gamingtips'],
    suggestedMedia: 'Gameplay GIF showing the tip',
  },
  weekly_recap: {
    type: 'weekly_recap',
    textJa: '今週のまとめ：たくさんのプレイヤーが参加してくれました！来週もよろしく。azuretier.net #azuretier #週間まとめ',
    textEn: 'Weekly recap: Great week with lots of players! See you next week. azuretier.net #azuretier #weeklyrecap',
    hashtags: ['#azuretier', '#weeklyrecap'],
    suggestedMedia: 'Stats infographic for the week',
  },
};

export async function generatePost(
  type: PostType,
  context?: Record<string, unknown>,
): Promise<GeneratedPost> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[Marketing] Gemini API key not set, using fallback template');
    return { ...FALLBACK_TEMPLATES[type] };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const contextStr = context ? `\nAdditional context: ${JSON.stringify(context)}` : '';

    const prompt = `${BRAND_SYSTEM_PROMPT}

Generate a "${type}" social media post.${contextStr}

Return a JSON object with these fields:
- "type": "${type}"
- "textJa": Japanese post text (max 280 chars, include hashtags)
- "textEn": English post text (max 280 chars, include hashtags)
- "hashtags": array of hashtag strings used
- "suggestedMedia": description of a suggested image or video to pair with the post

Return ONLY the JSON object, no markdown fencing.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      type,
      textJa: String(parsed.textJa || '').slice(0, 280),
      textEn: String(parsed.textEn || '').slice(0, 280),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      suggestedMedia: parsed.suggestedMedia || undefined,
    };
  } catch (error) {
    console.error('[Marketing] Gemini generation failed, using fallback:', error);
    return { ...FALLBACK_TEMPLATES[type] };
  }
}

export async function generateWeeklyRecap(stats: {
  newPlayers: number;
  gamesPlayed: number;
  topGameMode: string;
}): Promise<GeneratedPost> {
  return generatePost('weekly_recap', {
    weeklyStats: stats,
    instruction: `Include these stats naturally: ${stats.newPlayers} new players, ${stats.gamesPlayed} games played, top mode: ${stats.topGameMode}`,
  });
}
