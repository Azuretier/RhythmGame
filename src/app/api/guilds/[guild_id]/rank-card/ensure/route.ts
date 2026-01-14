import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/rank-card/firebase-admin';
import { normalizeDisplayName, generateCardId } from '@/lib/rank-card/utils';

interface Member {
  displayName: string;
  displayNameKey?: string;
  level: number;
  xp: number;
  rankName?: string;
  avatarUrl?: string;
  avaterUrl?: string; // Support legacy typo in existing data
}

interface RankCard {
  status: 'ready' | 'not_found' | 'ambiguous' | 'error';
  displayNameOriginal: string;
  displayNameKey: string;
  memberId?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  rankName?: string;
  avatarUrl?: string;
  updatedAt: string;
  candidates?: Array<{
    memberId: string;
    displayName: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { guild_id: string } }
) {
  try {
    const { displayNameOriginal } = await request.json();
    
    if (!displayNameOriginal || typeof displayNameOriginal !== 'string') {
      return NextResponse.json(
        { error: 'displayNameOriginal is required and must be a string' },
        { status: 400 }
      );
    }

    const guildId = params.guild_id;
    const displayNameKey = normalizeDisplayName(displayNameOriginal);
    const cardId = generateCardId(guildId, displayNameKey);

    const db = getAdminDb();
    const membersRef = db.collection(`guilds/${guildId}/members`);
    
    // Try to find members by displayNameKey first, then fallback to exact displayName match
    let membersSnapshot = await membersRef
      .where('displayNameKey', '==', displayNameKey)
      .get();
    
    // Fallback to displayName if no displayNameKey matches
    if (membersSnapshot.empty) {
      membersSnapshot = await membersRef
        .where('displayName', '==', displayNameOriginal)
        .get();
    }

    const rankCardRef = db.doc(`guilds/${guildId}/rankCards/${cardId}`);
    
    if (membersSnapshot.empty) {
      // No member found
      const notFoundCard: RankCard = {
        status: 'not_found',
        displayNameOriginal,
        displayNameKey,
        updatedAt: new Date().toISOString(),
      };
      
      await rankCardRef.set(notFoundCard);
      
      return NextResponse.json({
        cardId,
        status: 'not_found',
      });
    }

    if (membersSnapshot.size > 1) {
      // Multiple members found - ambiguous
      const candidates = membersSnapshot.docs.map(doc => ({
        memberId: doc.id,
        displayName: doc.data().displayName,
      }));
      
      const ambiguousCard: RankCard = {
        status: 'ambiguous',
        displayNameOriginal,
        displayNameKey,
        candidates,
        updatedAt: new Date().toISOString(),
      };
      
      await rankCardRef.set(ambiguousCard);
      
      return NextResponse.json({
        cardId,
        status: 'ambiguous',
        candidates,
      });
    }

    // Single member found - ready
    const memberDoc = membersSnapshot.docs[0];
    const memberData = memberDoc.data() as Member;
    
    // Calculate XP to next level (simple formula: level * 100)
    // Ensure xpToNext is never negative
    const xpToNext = Math.max(0, (memberData.level + 1) * 100 - memberData.xp);
    
    // Support both avatarUrl and avaterUrl (legacy typo)
    // Prefer avatarUrl if both are present
    const avatarUrl = memberData.avatarUrl || memberData.avaterUrl;
    
    const readyCard: RankCard = {
      status: 'ready',
      displayNameOriginal,
      displayNameKey,
      memberId: memberDoc.id,
      level: memberData.level,
      xp: memberData.xp,
      xpToNext,
      rankName: memberData.rankName,
      avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    
    await rankCardRef.set(readyCard);
    
    return NextResponse.json({
      cardId,
      status: 'ready',
      data: readyCard,
    });
    
  } catch (error) {
    console.error('Error in ensure rank card:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
