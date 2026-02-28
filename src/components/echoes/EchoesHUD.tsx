'use client';

import { useState } from 'react';
import type { useEchoesSocket } from '@/hooks/useEchoesSocket';
import styles from './EchoesGame.module.css';

interface Props {
  socket: ReturnType<typeof useEchoesSocket>;
}

export function EchoesHUD({ socket }: Props) {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = () => {
    if (chatInput.trim()) {
      socket.sendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const emotes = ['👋', '👍', '😮', '😂', '💪', '🔥', '❄️', '⚡'];

  return (
    <div className={styles.hud}>
      {/* Top-right: mini-map placeholder */}
      <div className={styles.hudTopRight}>
        <button className={styles.hudButton} onClick={socket.goToMenu}>
          Menu
        </button>
      </div>

      {/* Bottom-left: chat */}
      <div className={styles.hudBottomLeft}>
        {/* Chat messages */}
        {showChat && (
          <div className={styles.chatBox}>
            <div className={styles.chatMessages}>
              {socket.chatMessages.slice(-10).map((msg, i) => (
                <div key={i} className={styles.chatMessage}>
                  <span className={styles.chatSender}>{msg.playerName}:</span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
            <div className={styles.chatInputRow}>
              <input
                className={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                maxLength={200}
              />
              <button className={styles.chatSendButton} onClick={handleSendChat}>
                Send
              </button>
            </div>
          </div>
        )}
        <button
          className={styles.hudButton}
          onClick={() => setShowChat(!showChat)}
        >
          Chat
        </button>
      </div>

      {/* Bottom-right: emotes */}
      <div className={styles.hudBottomRight}>
        <div className={styles.emoteBar}>
          {emotes.map((emote) => (
            <button
              key={emote}
              className={styles.emoteButton}
              onClick={() => socket.sendEmote(emote)}
            >
              {emote}
            </button>
          ))}
        </div>
      </div>

      {/* Emote popups */}
      {socket.emotes.slice(-3).map((e, i) => (
        <div key={i} className={styles.emotePopup} style={{ right: `${20 + i * 60}px` }}>
          <span className={styles.emoteIcon}>{e.emoteId}</span>
        </div>
      ))}
    </div>
  );
}
