import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { normalizeDisplayName, generateCardId } from '@/lib/rank-card-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { guild_id: string } }
) {
  try {
    const { guild_id: guildId } = params;
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing displayName' },
        { status: 400 }
      );
    }

    if (!guildId || typeof guildId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing guild_id' },
        { status: 400 }
      );
    }

    // Normalize the display name for lookup
    const displayNameKey = normalizeDisplayName(displayName);
    const cardId = await generateCardId(guildId, displayNameKey);
    const db = getAdminFirestore();

    // Query members collection by displayNameKey (preferred) or displayName (fallback)
    const membersRef = db.collection(`guilds/${guildId}/members`);
    
    // Try querying by displayNameKey first
    let membersSnapshot = await membersRef
      .where('displayNameKey', '==', displayNameKey)
      .get();

    // Fallback to displayName if displayNameKey doesn't exist or no results
    if (membersSnapshot.empty) {
      membersSnapshot = await membersRef
        .where('displayName', '==', displayName)
        .get();
    }

    // Handle not found
    if (membersSnapshot.empty) {
      const rankCardRef = db.doc(`guilds/${guildId}/rankCards/${cardId}`);
      
      await rankCardRef.set({
        guildId,
        displayName,
        displayNameKey,
        status: 'not_found',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({
        status: 'not_found',
        cardId,
        message: 'Member not found'
      });
    }

    // Handle ambiguous (multiple matches)
    if (membersSnapshot.size > 1) {
      const candidates = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName,
        level: doc.data().level,
        xp: doc.data().xp,
      }));

      const rankCardRef = db.doc(`guilds/${guildId}/rankCards/${cardId}`);
      
      await rankCardRef.set({
        guildId,
        displayName,
        displayNameKey,
        status: 'ambiguous',
        candidates,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({
        status: 'ambiguous',
        cardId,
        candidates,
        message: 'Multiple members found with this display name'
      });
    }

    // Single match found - success case
    const memberDoc = membersSnapshot.docs[0];
    const memberData = memberDoc.data();
    
    const rankCardRef = db.doc(`guilds/${guildId}/rankCards/${cardId}`);

    // Handle avatar field (might be avatarUrl or misspelled avaterUrl)
    const avatarUrl = memberData.avatarUrl || memberData.avaterUrl || null;

    await rankCardRef.set({
      guildId,
      memberId: memberDoc.id,
      displayName: memberData.displayName,
      displayNameKey,
      level: memberData.level || 0,
      xp: memberData.xp || 0,
      rankName: memberData.rankName || null,
      avatarUrl,
      status: 'found',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      status: 'found',
      cardId,
      data: {
        displayName: memberData.displayName,
        level: memberData.level || 0,
        xp: memberData.xp || 0,
        rankName: memberData.rankName || null,
        avatarUrl,
      }
    });

  } catch (error) {
    console.error('Error in rank-card ensure endpoint:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
