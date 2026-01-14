'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/rank-card/firebase';
import { normalizeDisplayName, generateCardId } from '@/lib/rank-card/utils';
import RankCard from '@/components/rank-card/RankCard';
import RankCardLoading from '@/components/rank-card/RankCardLoading';
import RankCardNotFound from '@/components/rank-card/RankCardNotFound';
import RankCardAmbiguous from '@/components/rank-card/RankCardAmbiguous';
import RankCardError from '@/components/rank-card/RankCardError';

interface PageProps {
  params: {
    guild_id: string;
    user_discord_display_name: string;
  };
}

interface RankCardData {
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

export default function RankCardPage({ params }: PageProps) {
  const [cardData, setCardData] = useState<RankCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeRankCard = async () => {
      try {
        // Decode and normalize the display name
        const encodedName = params.user_discord_display_name;
        const decodedName = decodeURIComponent(encodedName);
        const displayNameOriginal = decodedName.trim().normalize('NFKC');
        const displayNameKey = normalizeDisplayName(decodedName); // Normalize from decoded name
        const cardId = generateCardId(params.guild_id, displayNameKey);

        // Call ensure endpoint to create/update the rank card
        const response = await fetch(`/api/guilds/${params.guild_id}/rank-card/ensure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ displayNameOriginal }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to ensure rank card');
        }

        // Subscribe to real-time updates
        const rankCardRef = doc(db, `guilds/${params.guild_id}/rankCards/${cardId}`);
        
        unsubscribe = onSnapshot(
          rankCardRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as RankCardData;
              setCardData(data);
              setLoading(false);
            } else {
              setError('Rank card not found');
              setLoading(false);
            }
          },
          (err) => {
            console.error('Error listening to rank card:', err);
            setError('Failed to load rank card data');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error initializing rank card:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setLoading(false);
      }
    };

    initializeRankCard();

    return () => unsubscribe?.();
  }, [params.guild_id, params.user_discord_display_name]);

  // Show loading screen
  if (loading) {
    return <RankCardLoading />;
  }

  // Show error screen
  if (error) {
    return <RankCardError message={error} />;
  }

  // Show appropriate screen based on status
  if (cardData) {
    switch (cardData.status) {
      case 'ready':
        if (cardData.level !== undefined && cardData.xp !== undefined && cardData.xpToNext !== undefined) {
          return (
            <RankCard
              displayName={cardData.displayNameOriginal}
              level={cardData.level}
              xp={cardData.xp}
              xpToNext={cardData.xpToNext}
              rankName={cardData.rankName}
              avatarUrl={cardData.avatarUrl}
            />
          );
        }
        return <RankCardError message="Incomplete rank card data" />;
      
      case 'not_found':
        return <RankCardNotFound displayName={cardData.displayNameOriginal} />;
      
      case 'ambiguous':
        if (cardData.candidates) {
          return (
            <RankCardAmbiguous
              displayName={cardData.displayNameOriginal}
              candidates={cardData.candidates}
            />
          );
        }
        return <RankCardError message="Ambiguous match but no candidates provided" />;
      
      case 'error':
        return <RankCardError message="An error occurred while loading the rank card" />;
      
      default:
        return <RankCardError message="Unknown rank card status" />;
    }
  }

  return <RankCardError message="No rank card data available" />;
}
