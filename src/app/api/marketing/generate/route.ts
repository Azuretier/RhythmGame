import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';
import { generatePost, type PostType } from '@/lib/marketing/content-generator';
import { queuePost } from '@/lib/marketing/post-scheduler';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 });

const POST_TYPES: PostType[] = [
  'devlog',
  'shop_announcement',
  'season_announcement',
  'community_highlight',
  'tip_of_the_day',
  'weekly_recap',
];

const generateSchema = z.object({
  type: z.enum(POST_TYPES as [PostType, ...PostType[]]),
  context: z.record(z.string(), z.unknown()).optional(),
  scheduleAt: z.string().datetime().optional(),
  platforms: z.array(z.enum(['x', 'discord'])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } },
      );
    }

    const rawBody = await request.json();
    const parsed = generateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { type, context, scheduleAt, platforms } = parsed.data;

    const post = await generatePost(type, context);

    let queuedId: string | undefined;
    if (scheduleAt) {
      const targetPlatforms = platforms || ['discord'];
      queuedId = await queuePost(post, scheduleAt, targetPlatforms);
      post.scheduledFor = scheduleAt;
    }

    return NextResponse.json({ post, queuedId });
  } catch (error) {
    console.error('[Marketing] Generate API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
