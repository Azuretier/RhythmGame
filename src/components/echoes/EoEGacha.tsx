'use client';

import { useState } from 'react';
import type { useEoESocket } from '@/hooks/useEoESocket';
import type { GachaPullResult } from '@/types/echoes';
import { getCharacterDefinition, getAllCharacters } from '@/lib/echoes/characters';
import { ELEMENT_COLORS } from '@/lib/echoes/elements';
import { STANDARD_BANNER, getPityInfo } from '@/lib/echoes/gacha';
import styles from './EoEGame.module.css';

interface Props {
  socket: ReturnType<typeof useEoESocket>;
}

export function EoEGacha({ socket }: Props) {
  const { gachaResults, gachaState } = socket;
  const [showResults, setShowResults] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(-1);

  const pityInfo = gachaState ? getPityInfo(gachaState, STANDARD_BANNER.id) : null;

  const handlePull = (count: 1 | 10) => {
    socket.gachaPull(STANDARD_BANNER.id, count);
    setShowResults(true);
    setRevealedIndex(-1);
  };

  const handleRevealNext = () => {
    setRevealedIndex((prev) => Math.min(prev + 1, gachaResults.length - 1));
  };

  const handleRevealAll = () => {
    setRevealedIndex(gachaResults.length - 1);
  };

  const renderPullResult = (result: GachaPullResult, index: number) => {
    const isRevealed = index <= revealedIndex;
    const char = getCharacterDefinition(result.itemId);

    return (
      <div
        key={index}
        className={`${styles.gachaCard} ${isRevealed ? styles.gachaCardRevealed : ''} ${styles[`gacha_${result.animation}`]}`}
        onClick={handleRevealNext}
      >
        {isRevealed ? (
          <>
            <div className={styles.gachaRarity}>{'★'.repeat(result.rarity)}</div>
            <div
              className={styles.gachaCharName}
              style={{ color: char ? ELEMENT_COLORS[char.element] : '#fff' }}
            >
              {char?.nameJa ?? result.itemId}
            </div>
            <div className={styles.gachaCharTitle}>{char?.titleJa ?? ''}</div>
            {result.isNew && <div className={styles.gachaNewBadge}>NEW!</div>}
            {result.isFeatured && <div className={styles.gachaFeaturedBadge}>FEATURED</div>}
            {result.isPity && <div className={styles.gachaPityBadge}>PITY</div>}
          </>
        ) : (
          <div className={styles.gachaHidden}>?</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.gachaScreen}>
      <h2 className={styles.gachaTitle}>Echoes of Eternity</h2>
      <p className={styles.gachaSubtitle}>エコーズ・オブ・エタニティ ガチャ</p>

      {/* Banner info */}
      <div className={styles.bannerInfo}>
        <div className={styles.bannerName}>{STANDARD_BANNER.nameJa}</div>
        <div className={styles.bannerRates}>
          ★★★★★: {(STANDARD_BANNER.basePullRates.fiveStar * 100).toFixed(1)}% |
          ★★★★: {(STANDARD_BANNER.basePullRates.fourStar * 100).toFixed(1)}%
        </div>
      </div>

      {/* Pity counter */}
      {pityInfo && (
        <div className={styles.pityInfo}>
          <span>5★ Pity: {pityInfo.fiveStarPity}/90</span>
          <span>4★ Pity: {pityInfo.fourStarPity}/10</span>
          <span>Total Pulls: {pityInfo.totalPulls}</span>
          {pityInfo.isGuaranteedFeatured && (
            <span className={styles.guaranteedBadge}>Next 5★ Guaranteed Featured</span>
          )}
        </div>
      )}

      {/* Pull results */}
      {showResults && gachaResults.length > 0 && (
        <div className={styles.gachaResults}>
          <div className={styles.gachaCardGrid}>
            {gachaResults.map((result, i) => renderPullResult(result, i))}
          </div>
          <div className={styles.gachaRevealActions}>
            {revealedIndex < gachaResults.length - 1 && (
              <>
                <button className={styles.secondaryButton} onClick={handleRevealNext}>
                  Reveal Next
                </button>
                <button className={styles.secondaryButton} onClick={handleRevealAll}>
                  Reveal All
                </button>
              </>
            )}
            {revealedIndex >= gachaResults.length - 1 && (
              <button className={styles.secondaryButton} onClick={() => setShowResults(false)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pull buttons */}
      {!showResults && (
        <div className={styles.pullButtons}>
          <button className={styles.pullButton} onClick={() => handlePull(1)}>
            <span className={styles.pullLabel}>Single Pull</span>
            <span className={styles.pullCost}>{STANDARD_BANNER.costPerPull} Crystals</span>
          </button>
          <button className={`${styles.pullButton} ${styles.pullButton10}`} onClick={() => handlePull(10)}>
            <span className={styles.pullLabel}>10-Pull</span>
            <span className={styles.pullCost}>{STANDARD_BANNER.costPer10Pull} Crystals</span>
          </button>
        </div>
      )}

      {/* Back button */}
      <button className={styles.backButton} onClick={socket.goToMenu}>
        Back to Menu
      </button>
    </div>
  );
}
