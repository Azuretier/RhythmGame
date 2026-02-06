/**
 * Firestore Room Service
 *
 * Room persistence is now handled directly by MultiplayerRoomManager
 * via its Firestore write-through layer. Pass a Firestore instance to
 * the RoomManager constructor and call loadFromFirestore() on startup.
 *
 * Collection: "multiplayer_rooms"
 * Document ID: Room code (e.g., "ABCD")
 *
 * See RoomManager.ts for implementation details.
 */

export { MultiplayerRoomManager } from './RoomManager';
export type { Room } from './RoomManager';
