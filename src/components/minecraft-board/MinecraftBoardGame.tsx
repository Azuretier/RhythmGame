'use client';

// =============================================================
// Minecraft Board Game - Main Game Component
// Orchestrates all game phases: menu, lobby, countdown, playing, ended
// =============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMinecraftBoardSocket } from '@/hooks/useMinecraftBoardSocket';
import BoardRenderer from './BoardRenderer';
import PlayerHUD, { InventoryPanel } from './PlayerHUD';
import CraftingPanel from './CraftingPanel';
import type { Direction, MCPublicRoom } from '@/types/minecraft-board';
import { BLOCK_PROPERTIES } from '@/types/minecraft-board';
import styles from './MinecraftBoard.module.css';

export default function MinecraftBoardGame() {
  const {
    connectionStatus, playerId, connectWebSocket, disconnect,
    phase, setPhase, roomState, publicRooms, countdownCount,
    exploredTilesRef, visibleTiles, visiblePlayers, visibleMobs,
    selfState, dayPhase, timeOfDay,
    chatMessages, gameMessage, winner,
    createRoom, joinRoom, getRooms, leaveRoom,
    setReady, startGame,
    move, mine, cancelMine, craft, attack, placeBlock, eat, selectSlot, sendChat,
  } = useMinecraftBoardSocket();

  // UI state
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [tab, setTab] = useState<'create' | 'join' | 'browse'>('create');
  const [showCrafting, setShowCrafting] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const browseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();
    return () => disconnect();
  }, [connectWebSocket, disconnect]);

  // Auto-refresh room list when browsing
  useEffect(() => {
    if (tab === 'browse' && phase === 'menu') {
      getRooms();
      browseIntervalRef.current = setInterval(getRooms, 5000);
    }
    return () => {
      if (browseIntervalRef.current) clearInterval(browseIntervalRef.current);
    };
  }, [tab, phase, getRooms]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Keyboard shortcut: E for crafting, I for inventory, T for chat
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (phase !== 'playing') return;
      if (e.key === 'e' || e.key === 'E') { setShowCrafting(p => !p); setShowInventory(false); }
      if (e.key === 'i' || e.key === 'I') { setShowInventory(p => !p); setShowCrafting(false); }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); setShowChat(true); }
      if (e.key === 'Escape') { setShowCrafting(false); setShowInventory(false); setShowChat(false); }
      // Number keys for hotbar
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) selectSlot(num - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, selectSlot]);

  // === Handlers ===

  const handleCreateRoom = useCallback(() => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim(), roomName.trim() || undefined);
  }, [playerName, roomName, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!playerName.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim(), playerName.trim());
  }, [playerName, roomCode, joinRoom]);

  const handleJoinPublic = useCallback((room: MCPublicRoom) => {
    if (!playerName.trim()) return;
    joinRoom(room.code, playerName.trim());
  }, [playerName, joinRoom]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!selfState) return;
    const dist = Math.abs(selfState.x - x) + Math.abs(selfState.y - y);

    if (dist === 0) return; // Clicked on self

    // If adjacent, try to mine
    if (dist === 1) {
      const key = `${x},${y}`;
      const tile = exploredTilesRef.current.get(key);
      if (tile) {
        const props = BLOCK_PROPERTIES[tile.block];
        if (props.mineable && props.hardness > 0) {
          mine(x, y);
          return;
        }
        if (props.walkable || !props.solid) {
          // Move there
          const dx = x - selfState.x;
          const dy = y - selfState.y;
          if (dx === 1) move('right');
          else if (dx === -1) move('left');
          else if (dy === 1) move('down');
          else if (dy === -1) move('up');
          return;
        }
      }
      mine(x, y); // Try mining anyway
    }
  }, [selfState, exploredTilesRef, mine, move]);

  const handleMobClick = useCallback((mobId: string) => {
    attack(mobId);
  }, [attack]);

  const handlePlayerClick = useCallback((targetId: string) => {
    attack(targetId);
  }, [attack]);

  const handleMove = useCallback((direction: Direction) => {
    move(direction);
  }, [move]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatInput('');
  }, [chatInput, sendChat]);

  // === Render ===

  // Connection overlay
  if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <div className={styles.spinner} />
          <p>{connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <p>Disconnected from server</p>
          <button className={styles.btn} onClick={connectWebSocket}>Reconnect</button>
        </div>
      </div>
    );
  }

  // === Menu Phase ===
  if (phase === 'menu') {
    return (
      <div className={styles.page}>
        <div className={styles.menuContainer}>
          <h1 className={styles.title}>Minecraft Board Game</h1>
          <p className={styles.subtitle}>Explore, Mine, Craft, Survive!</p>

          {/* Player name */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Player Name</label>
            <input
              className={styles.input}
              value={playerName}
              onChange={e => setPlayerName(e.target.value.slice(0, 16))}
              placeholder="Enter your name..."
              maxLength={16}
            />
          </div>

          {/* Tab selection */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
              onClick={() => setTab('create')}
            >Create</button>
            <button
              className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
              onClick={() => setTab('join')}
            >Join</button>
            <button
              className={`${styles.tab} ${tab === 'browse' ? styles.tabActive : ''}`}
              onClick={() => setTab('browse')}
            >Browse</button>
          </div>

          {/* Tab content */}
          {tab === 'create' && (
            <div className={styles.tabContent}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>World Name (optional)</label>
                <input
                  className={styles.input}
                  value={roomName}
                  onChange={e => setRoomName(e.target.value.slice(0, 30))}
                  placeholder="My World"
                  maxLength={30}
                />
              </div>
              <button
                className={styles.btnPrimary}
                onClick={handleCreateRoom}
                disabled={!playerName.trim()}
              >
                Create World
              </button>
            </div>
          )}

          {tab === 'join' && (
            <div className={styles.tabContent}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Room Code</label>
                <input
                  className={`${styles.input} ${styles.inputCode}`}
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="ABCDE"
                  maxLength={5}
                />
              </div>
              <button
                className={styles.btnPrimary}
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
              >
                Join World
              </button>
            </div>
          )}

          {tab === 'browse' && (
            <div className={styles.tabContent}>
              {publicRooms.length === 0 ? (
                <p className={styles.emptyText}>No public worlds available</p>
              ) : (
                <div className={styles.roomList}>
                  {publicRooms.map(room => (
                    <div key={room.code} className={styles.roomCard}>
                      <div className={styles.roomInfo}>
                        <span className={styles.roomName}>{room.name}</span>
                        <span className={styles.roomMeta}>
                          {room.hostName} | {room.playerCount}/{room.maxPlayers}
                        </span>
                      </div>
                      <button
                        className={styles.btn}
                        onClick={() => handleJoinPublic(room)}
                        disabled={!playerName.trim()}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to play */}
          <div className={styles.howToPlay}>
            <h3>How to Play</h3>
            <ul>
              <li>WASD / Arrow keys to move</li>
              <li>Click adjacent blocks to mine</li>
              <li>E to open crafting, I for inventory</li>
              <li>Right-click food in hotbar to eat</li>
              <li>1-9 to select hotbar slot</li>
              <li>Craft the Ender Portal Frame to win!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // === Lobby Phase ===
  if (phase === 'lobby' && roomState) {
    const isHost = roomState.hostId === playerId;
    const allReady = roomState.players.every(p => p.ready || p.id === playerId);

    return (
      <div className={styles.page}>
        <div className={styles.lobbyContainer}>
          <h2 className={styles.lobbyTitle}>{roomState.name}</h2>
          <div className={styles.roomCodeDisplay}>
            Room Code: <strong>{roomState.code}</strong>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard?.writeText(roomState.code)}
            >
              Copy
            </button>
          </div>

          <div className={styles.playerList}>
            <h3>Players ({roomState.players.length}/{roomState.maxPlayers})</h3>
            {roomState.players.map(p => (
              <div key={p.id} className={styles.playerRow}>
                <span className={styles.playerColor} style={{ backgroundColor: p.color }} />
                <span className={styles.playerNameLobby}>
                  {p.name}
                  {p.id === roomState.hostId && <span className={styles.hostBadge}>HOST</span>}
                </span>
                <span className={`${styles.readyStatus} ${p.ready ? styles.ready : styles.notReady}`}>
                  {p.ready ? 'Ready' : 'Not Ready'}
                </span>
                {!p.connected && <span className={styles.disconnectedBadge}>DC</span>}
              </div>
            ))}
          </div>

          <div className={styles.lobbyActions}>
            {!isHost && (
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  const me = roomState.players.find(p => p.id === playerId);
                  setReady(!me?.ready);
                }}
              >
                {roomState.players.find(p => p.id === playerId)?.ready ? 'Unready' : 'Ready'}
              </button>
            )}
            {isHost && (
              <button
                className={styles.btnPrimary}
                onClick={startGame}
                disabled={roomState.players.length < 1 || !allReady}
              >
                Start Game
              </button>
            )}
            <button className={styles.btn} onClick={leaveRoom}>
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Countdown Phase ===
  if (phase === 'countdown') {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <div className={styles.countdownNumber}>{countdownCount}</div>
          <p>Game starting...</p>
        </div>
      </div>
    );
  }

  // === Playing Phase ===
  if (phase === 'playing' && selfState && playerId) {
    return (
      <div className={styles.page}>
        <div className={styles.gameLayout}>
          {/* Board */}
          <div className={styles.boardArea}>
            <BoardRenderer
              visibleTiles={visibleTiles}
              exploredTilesRef={exploredTilesRef}
              visiblePlayers={visiblePlayers}
              visibleMobs={visibleMobs}
              selfState={selfState}
              dayPhase={dayPhase}
              playerId={playerId}
              onTileClick={handleTileClick}
              onMobClick={handleMobClick}
              onPlayerClick={handlePlayerClick}
              onMove={handleMove}
            />
          </div>

          {/* HUD */}
          <PlayerHUD
            selfState={selfState}
            onSelectSlot={selectSlot}
            onEat={eat}
            onToggleCrafting={() => { setShowCrafting(p => !p); setShowInventory(false); }}
            onToggleInventory={() => { setShowInventory(p => !p); setShowCrafting(false); }}
          />

          {/* Crafting Panel */}
          {showCrafting && (
            <div className={styles.overlay}>
              <CraftingPanel
                selfState={selfState}
                exploredTilesRef={exploredTilesRef}
                onCraft={craft}
                onClose={() => setShowCrafting(false)}
              />
            </div>
          )}

          {/* Inventory Panel */}
          {showInventory && (
            <div className={styles.overlay}>
              <InventoryPanel
                selfState={selfState}
                onSelectSlot={selectSlot}
                onEat={eat}
                onClose={() => setShowInventory(false)}
              />
            </div>
          )}

          {/* Chat */}
          <div className={`${styles.chatArea} ${showChat ? styles.chatOpen : ''}`}>
            <button className={styles.chatToggle} onClick={() => setShowChat(p => !p)}>
              Chat {chatMessages.length > 0 ? `(${chatMessages.length})` : ''}
            </button>
            {showChat && (
              <>
                <div className={styles.chatMessages}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={styles.chatMsg}>
                      <span className={styles.chatName}>{msg.playerName}:</span> {msg.message}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form
                  className={styles.chatInputArea}
                  onSubmit={e => { e.preventDefault(); handleSendChat(); }}
                >
                  <input
                    className={styles.chatInput}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value.slice(0, 100))}
                    placeholder="Type a message..."
                    maxLength={100}
                    autoFocus
                  />
                  <button type="submit" className={styles.chatSendBtn}>Send</button>
                </form>
              </>
            )}
          </div>

          {/* Game message toast */}
          {gameMessage && (
            <div className={styles.gameToast}>{gameMessage}</div>
          )}

          {/* Dead overlay */}
          {selfState.dead && (
            <div className={styles.deadOverlay}>
              <h2>You Died!</h2>
              <p>Respawning...</p>
            </div>
          )}

          {/* Leave button */}
          <button className={styles.leaveBtn} onClick={leaveRoom}>
            Leave Game
          </button>
        </div>
      </div>
    );
  }

  // === Ended Phase ===
  if (phase === 'ended') {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <h1 className={styles.endTitle}>Game Over!</h1>
          {winner && (
            <div className={styles.winnerDisplay}>
              <p className={styles.winnerText}>
                {winner.id === playerId ? 'You Win!' : `${winner.name} Wins!`}
              </p>
              <p>Crafted the Ender Portal Frame!</p>
            </div>
          )}
          <button className={styles.btnPrimary} onClick={leaveRoom}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={styles.page}>
      <div className={styles.centerBox}>
        <div className={styles.spinner} />
      </div>
    </div>
  );
}
