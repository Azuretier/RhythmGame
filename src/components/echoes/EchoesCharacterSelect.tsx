'use client';

import { useState } from 'react';
import type { useEchoesSocket } from '@/hooks/useEchoesSocket';
import { getAllCharacters, analyzeParty } from '@/lib/echoes/characters';
import { ELEMENT_COLORS, ELEMENT_NAMES_JA } from '@/lib/echoes/elements';
import styles from './EchoesGame.module.css';

interface Props {
  socket: ReturnType<typeof useEchoesSocket>;
}

export function EchoesCharacterSelect({ socket }: Props) {
  const characters = getAllCharacters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedChar = selectedId ? characters.find((c) => c.id === selectedId) : null;

  return (
    <div className={styles.charSelectScreen}>
      <h2 className={styles.charSelectTitle}>Select Your Champion</h2>

      <div className={styles.charSelectLayout}>
        {/* Character grid */}
        <div className={styles.charSelectGrid}>
          {characters.map((char) => (
            <button
              key={char.id}
              className={`${styles.charSelectCard} ${selectedId === char.id ? styles.charSelectCardActive : ''}`}
              onClick={() => {
                setSelectedId(char.id);
                socket.selectCharacter(char.id);
              }}
              style={{ '--char-color': ELEMENT_COLORS[char.element] } as React.CSSProperties}
            >
              <div className={styles.charSelectRarity}>{'★'.repeat(char.rarity)}</div>
              <div className={styles.charSelectName}>{char.name}</div>
              <div className={styles.charSelectNameJa}>{char.nameJa}</div>
              <div className={styles.charSelectElement}>{ELEMENT_NAMES_JA[char.element]}</div>
              <div className={styles.charSelectRole}>{char.role}</div>
            </button>
          ))}
        </div>

        {/* Character details */}
        {selectedChar && (
          <div className={styles.charDetail}>
            <h3 style={{ color: ELEMENT_COLORS[selectedChar.element] }}>
              {selectedChar.name} — {selectedChar.nameJa}
            </h3>
            <p className={styles.charTitle}>{selectedChar.titleJa}</p>
            <p className={styles.charLore}>{selectedChar.loreJa}</p>

            {/* Base stats */}
            <div className={styles.charStats}>
              <div className={styles.statRow}><span>HP</span><span>{selectedChar.baseStats.hp}</span></div>
              <div className={styles.statRow}><span>ATK</span><span>{selectedChar.baseStats.atk}</span></div>
              <div className={styles.statRow}><span>DEF</span><span>{selectedChar.baseStats.def}</span></div>
              <div className={styles.statRow}><span>SPD</span><span>{selectedChar.baseStats.speed}</span></div>
              <div className={styles.statRow}><span>CRIT</span><span>{Math.round(selectedChar.baseStats.critRate * 100)}%</span></div>
              <div className={styles.statRow}><span>EM</span><span>{selectedChar.baseStats.elementalMastery}</span></div>
            </div>

            {/* Skills */}
            <div className={styles.charSkillList}>
              <h4>Skills</h4>
              {selectedChar.skills.map((skill) => (
                <div key={skill.id} className={styles.skillDetail}>
                  <span className={styles.skillDetailName}>{skill.nameJa}</span>
                  <span className={styles.skillDetailType}>[{skill.skillType}]</span>
                  <p className={styles.skillDetailDesc}>{skill.descriptionJa}</p>
                  <div className={styles.skillDetailMeta}>
                    {skill.manaCost > 0 && <span>MP: {skill.manaCost}</span>}
                    {skill.cooldown > 0 && <span>CD: {skill.cooldown}</span>}
                    <span>DMG: x{skill.damageMultiplier}</span>
                    {skill.rhythmDifficulty && <span>Rhythm: {skill.rhythmDifficulty}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Passives */}
            <div className={styles.charPassives}>
              <h4>Passives</h4>
              {selectedChar.passives.map((passive) => (
                <div key={passive.id} className={styles.passiveDetail}>
                  <span className={styles.passiveName}>{passive.nameJa}</span>
                  <p className={styles.passiveDesc}>{passive.descriptionJa}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
