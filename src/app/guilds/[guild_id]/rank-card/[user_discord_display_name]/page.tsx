'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/MNSW/firebase';
import { RankCard } from '@/components/rank-card/RankCard';
import { RankCardSkeleton } from '@/components/rank-card/RankCardSkeleton';
import { normalizeDisplayName, generateCardId } from '@/lib/rank-card-utils';

type RankCardStatus = 'loading' | 'found' | 'not_found' | 'ambiguous' | 'error';

interface RankCardData {
  displayName: string;
  level: number;
  xp: number;
  rankName?: string | null;
  avatarUrl?: string | null;
  status: string;
  candidates?: Array<{
    id: string;
    displayName: string;
    level: number;
    xp: number;
  }>;
}

export default function RankCardPage() {
  const params = useParams();
  const guildId = params.guild_id as string;
  const encodedDisplayName = params.user_discord_display_name as string;
  
  const [status, setStatus] = useState<RankCardStatus>('loading');
  const [cardData, setCardData] = useState<RankCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId || !encodedDisplayName) {
      setStatus('error');
      setError('Invalid URL parameters');
      return;
    }

    // Decode and normalize the display name
    const displayName = decodeURIComponent(encodedDisplayName)
      .trim()
      .normalize('NFKC');
    
    const displayNameKey = normalizeDisplayName(displayName);

    // Async function to set up the subscription
    const setupSubscription = async () => {
      const cardId = await generateCardId(guildId, displayNameKey);

      // Call the ensure endpoint to create/update the rank card
      const ensureRankCard = async () => {
        try {
          const response = await fetch(`/api/guilds/${guildId}/rank-card/ensure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ displayName }),
          });

          if (!response.ok) {
            throw new Error('Failed to ensure rank card');
          }

          // The API will create/update the document, now we can subscribe
        } catch (err) {
          console.error('Error ensuring rank card:', err);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Failed to load rank card');
        }
      };

      // Subscribe to the rank card document for real-time updates
      const rankCardRef = doc(db, `guilds/${guildId}/rankCards/${cardId}`);
      
      const unsubscribe = onSnapshot(
        rankCardRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as RankCardData;
            setCardData(data);
            
            if (data.status === 'found') {
              setStatus('found');
            } else if (data.status === 'not_found') {
              setStatus('not_found');
            } else if (data.status === 'ambiguous') {
              setStatus('ambiguous');
            }
          } else {
            // Document doesn't exist yet, it will be created by the ensure endpoint
            setStatus('loading');
          }
        },
        (err) => {
          console.error('Error subscribing to rank card:', err);
          setStatus('error');
          setError(err.message);
        }
      );

      // Call ensure endpoint
      ensureRankCard();

      // Cleanup subscription on unmount
      return unsubscribe;
    };

    let unsubscribePromise = setupSubscription();

    return () => {
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, [guildId, encodedDisplayName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {status === 'loading' && (
          <div className="space-y-4">
            <RankCardSkeleton />
            <p className="text-center text-slate-400 text-sm animate-pulse">
              Loading rank card...
            </p>
          </div>
        )}

        {status === 'found' && cardData && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <RankCard
              displayName={cardData.displayName}
              level={cardData.level}
              xp={cardData.xp}
              rankName={cardData.rankName}
              avatarUrl={cardData.avatarUrl}
            />
            <div className="text-center text-xs text-slate-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Live updates enabled</span>
              </div>
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center space-y-4">
            <div className="p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-white mb-2">Member Not Found</h2>
              <p className="text-slate-400">
                No member found with the display name "{cardData?.displayName}"
              </p>
            </div>
          </div>
        )}

        {status === 'ambiguous' && cardData && cardData.candidates && (
          <div className="space-y-4">
            <div className="p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10">
              <div className="text-6xl mb-4 text-center">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Multiple Members Found
              </h2>
              <p className="text-slate-400 text-center mb-6">
                Multiple members found with the display name "{cardData.displayName}". 
                Please be more specific.
              </p>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Candidates:</h3>
                {cardData.candidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-slate-800/50 border border-white/5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{candidate.displayName}</span>
                      <div className="text-sm text-slate-400">
                        Level {candidate.level} • {candidate.xp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="p-8 rounded-2xl bg-red-900/20 backdrop-blur-xl border border-red-500/20">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-red-300">
                {error || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
