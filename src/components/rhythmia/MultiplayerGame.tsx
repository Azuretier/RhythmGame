'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/rhythmia/firebase';
import styles from './MultiplayerGame.module.css';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type GameMode = 'lobby' | 'name-entry' | 'room-browser' | 'waiting-room' | 'playing';

interface Room {
  id: string;
  name: string;
  host: string;
  hostName?: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: Timestamp;
  status: 'waiting' | 'playing' | 'finished';
  playerList?: Player[];
}

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
}

export default function MultiplayerGame() {
  const [mode, setMode] = useState<GameMode>('lobby');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [playerName, setPlayerName] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const playerIdRef = useRef<string>('');
  const roomIdRef = useRef<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Authenticate with Firebase anonymously
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        playerIdRef.current = user.uid;
        setIsAuthenticated(true);
      } else {
        playerIdRef.current = '';
        setIsAuthenticated(false);
      }
    });
    
    // Sign in anonymously after setting up the listener
    signInAnonymously(auth).catch((error) => {
      console.error('Authentication error:', error);
      setConnectionStatus('error');
      setError('認証に失敗しました。ページを再読み込みしてください。');
    });
    
    return () => unsubscribe();
  }, []);
  
  // Connect to Firebase
  const connectToFirebase = useCallback(async () => {
    try {
      if (!db || !auth) {
        console.error('Firebase not configured');
        setConnectionStatus('error');
        return;
      }
      setConnectionStatus('connecting');
      
      // Test Firebase connection with a simple query
      const testQuery = query(collection(db, 'rhythmia_rooms'));
      await getDocs(testQuery);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Firebase connection error:', error);
      setConnectionStatus('error');
    }
  }, []);
  
  useEffect(() => {
    connectToFirebase();
  }, [connectToFirebase]);
  
  // Listen to rooms list
  useEffect(() => {
    if (mode !== 'room-browser' || !db) return;
    
    const roomsQuery = query(
      collection(db, 'rhythmia_rooms'),
      where('status', '==', 'waiting')
    );
    
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const roomsList: Room[] = [];
      snapshot.forEach((doc) => {
        roomsList.push({ id: doc.id, ...doc.data() } as Room);
      });
      setRooms(roomsList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
    });
    
    return () => unsubscribe();
  }, [mode]);
  
  const handleNameSubmit = useCallback(() => {
    if (playerName.trim().length < 2) return;
    if (!isAuthenticated) {
      setError('認証が完了していません。もう一度お試しください。');
      return;
    }
    // playerIdRef.current is already set by onAuthStateChanged
    setMode('room-browser');
  }, [playerName, isAuthenticated]);
  
  const createRoom = useCallback(async () => {
    if (newRoomName.trim().length < 3) {
      setError('部屋名は3文字以上で入力してください');
      return;
    }
    
    if (!db) {
      setError('Firebaseが設定されていません');
      return;
    }
    
    try {
      setError(null);
      const roomData = {
        name: newRoomName,
        host: playerIdRef.current,
        hostName: playerName,
        players: 1,
        maxPlayers: 2,
        isPrivate: isPrivateRoom,
        status: 'waiting',
        createdAt: serverTimestamp(),
        playerList: [
          {
            id: playerIdRef.current,
            name: playerName,
            score: 0,
            isReady: false
          }
        ]
      };
      
      const docRef = await addDoc(collection(db, 'rhythmia_rooms'), roomData);
      roomIdRef.current = docRef.id;
      const newRoom: Room = {
        id: docRef.id,
        name: roomData.name,
        host: roomData.host,
        hostName: roomData.hostName,
        players: roomData.players,
        maxPlayers: roomData.maxPlayers,
        isPrivate: roomData.isPrivate,
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        createdAt: Timestamp.now(),
        playerList: roomData.playerList
      };
      setCurrentRoom(newRoom);
      setMode('waiting-room');
    } catch (error) {
      console.error('Error creating room:', error);
      setError('部屋の作成に失敗しました');
    }
  }, [newRoomName, isPrivateRoom, playerName]);
  
  const joinRoom = useCallback(async (room: Room) => {
    if (room.players >= room.maxPlayers) {
      setError('この部屋は満員です');
      return;
    }
    
    if (!db) {
      setError('Firebaseが設定されていません');
      return;
    }
    
    try {
      setError(null);
      const roomRef = doc(db, 'rhythmia_rooms', room.id);
      const newPlayer = {
        id: playerIdRef.current,
        name: playerName,
        score: 0,
        isReady: false
      };
      
      await updateDoc(roomRef, {
        players: room.players + 1,
        playerList: [...(room.playerList || []), newPlayer]
      });
      
      roomIdRef.current = room.id;
      setCurrentRoom(room);
      setMode('waiting-room');
    } catch (error) {
      console.error('Error joining room:', error);
      setError('部屋への参加に失敗しました');
    }
  }, [playerName]);
  
  const leaveRoom = useCallback(async () => {
    if (!roomIdRef.current || !db) return;
    
    try {
      const roomRef = doc(db, 'rhythmia_rooms', roomIdRef.current);
      
      if (currentRoom?.host === playerIdRef.current) {
        // Host leaving - delete room
        await deleteDoc(roomRef);
      } else {
        // Player leaving - update player list
        const updatedPlayers = players.filter(p => p.id !== playerIdRef.current);
        await updateDoc(roomRef, {
          players: updatedPlayers.length,
          playerList: updatedPlayers
        });
      }
      
      setCurrentRoom(null);
      roomIdRef.current = '';
      setMode('room-browser');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [currentRoom, players]);
  
  const startGame = useCallback(async () => {
    if (!roomIdRef.current || currentRoom?.host !== playerIdRef.current || !db) return;
    
    try {
      const roomRef = doc(db, 'rhythmia_rooms', roomIdRef.current);
      await updateDoc(roomRef, {
        status: 'playing'
      });
      setMode('playing');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }, [currentRoom]);
  
  // Listen to current room updates
  useEffect(() => {
    if (mode !== 'waiting-room' || !roomIdRef.current || !db) return;
    
    const roomRef = doc(db, 'rhythmia_rooms', roomIdRef.current);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted
        setError('部屋が削除されました');
        setMode('room-browser');
        return;
      }
      
      const data = snapshot.data();
      const roomData: Room = {
        id: snapshot.id,
        name: data.name,
        host: data.host,
        hostName: data.hostName,
        players: data.players,
        maxPlayers: data.maxPlayers,
        isPrivate: data.isPrivate,
        createdAt: data.createdAt,
        status: data.status,
        playerList: data.playerList
      };
      setCurrentRoom(roomData);
      setPlayers(roomData.playerList || []);
      
      if (roomData.status === 'playing') {
        setMode('playing');
      }
    });
    
    return () => unsubscribe();
  }, [mode]);
  
  return (
    <div className={styles.container}>
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
          <span>
            {connectionStatus === 'connected' && '接続中'}
            {connectionStatus === 'connecting' && '接続中...'}
            {connectionStatus === 'error' && '接続エラー'}
            {connectionStatus === 'disconnected' && '未接続'}
          </span>
        </div>
      </div>
      
      {mode === 'lobby' && (
        <div className={styles.lobby}>
          <h1 className={styles.title}>BATTLE ARENA</h1>
          <p className={styles.subtitle}>オンライン対戦モード</p>
          
          <div className={styles.modeGrid}>
            <div className={`${styles.modeCard} ${styles.online}`} onClick={() => setMode('name-entry')}>
              <div className={styles.modeIcon}>🌐</div>
              <div className={styles.modeTitle}>オンライン対戦</div>
              <p className={styles.modeDesc}>他のプレイヤーとリアルタイムバトル</p>
            </div>
          </div>
        </div>
      )}
      
      {mode === 'name-entry' && (
        <div className={styles.nameEntryScreen}>
          <div className={styles.onlineTitle}>名前を入力</div>
          <input
            type="text"
            className={styles.nameInput}
            placeholder="プレイヤー名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={12}
            autoFocus
          />
          <button
            className={styles.nameBtn}
            onClick={handleNameSubmit}
            disabled={playerName.trim().length < 2}
          >
            次へ
          </button>
        </div>
      )}
      
      {mode === 'room-browser' && (
        <div className={styles.roomBrowser}>
          <div className={styles.onlineTitle}>オンラインロビー</div>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          <div className={styles.playerBadge}>
            <span>👤</span>
            <span>{playerName}</span>
          </div>
          
          <div className={styles.tabWidget}>
            <div className={styles.tabHeader}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'create' ? styles.active : ''}`}
                onClick={() => setActiveTab('create')}
              >
                部屋を作る
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'join' ? styles.active : ''}`}
                onClick={() => setActiveTab('join')}
              >
                部屋に参加
              </button>
            </div>
            
            <div className={styles.tabContent}>
              {activeTab === 'create' && (
                <div className={styles.createForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>部屋名</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="例: 初心者歓迎"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  
                  <div className={styles.toggleGroup}>
                    <span className={styles.toggleLabel}>プライベート部屋</span>
                    <div
                      className={`${styles.toggleSwitch} ${isPrivateRoom ? styles.active : ''}`}
                      onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                    />
                  </div>
                  
                  <button className={styles.createBtn} onClick={createRoom}>
                    部屋を作成
                  </button>
                </div>
              )}
              
              {activeTab === 'join' && (
                <div className={styles.roomList}>
                  {rooms.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>参加可能な部屋がありません</p>
                      <p>新しい部屋を作成してください</p>
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <div key={room.id} className={styles.roomItem} onClick={() => joinRoom(room)}>
                        <div className={styles.roomInfo}>
                          <div className={styles.roomName}>{room.name}</div>
                          <div className={styles.roomHost}>Host: {room.hostName || 'Unknown'}</div>
                        </div>
                        <div className={styles.roomPlayers}>
                          {room.players}/{room.maxPlayers}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          <button className={styles.backBtn} onClick={() => setMode('lobby')}>
            ← 戻る
          </button>
        </div>
      )}
      
      {mode === 'waiting-room' && currentRoom && (
        <div className={styles.waitingRoom}>
          <div className={styles.onlineTitle}>{currentRoom.name}</div>
          
          <div className={styles.playersGrid}>
            {players.map((player) => (
              <div key={player.id} className={styles.playerCard}>
                <div className={styles.playerName}>{player.name}</div>
                <div className={styles.playerStatus}>
                  {player.isReady ? '✓ 準備完了' : '待機中...'}
                </div>
              </div>
            ))}
            {players.length < (currentRoom.maxPlayers || 2) && (
              <div className={`${styles.playerCard} ${styles.empty}`}>
                <div className={styles.playerName}>待機中...</div>
              </div>
            )}
          </div>
          
          {currentRoom.host === playerIdRef.current && (
            <button
              className={styles.startBtn}
              onClick={startGame}
              disabled={players.length < 2}
            >
              ゲーム開始
            </button>
          )}
          
          <button className={styles.leaveBtn} onClick={leaveRoom}>
            部屋を出る
          </button>
        </div>
      )}
      
      {mode === 'playing' && (
        <div className={styles.gameView}>
          <div className={styles.gamePlaceholder}>
            <h2>ゲーム画面</h2>
            <p>ここにバトルゲームのUIが表示されます</p>
            <p className={styles.note}>※ 完全な実装には追加の開発が必要です</p>
          </div>
        </div>
      )}
    </div>
  );
}
