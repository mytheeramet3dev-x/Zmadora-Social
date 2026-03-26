import { randomUUID } from "node:crypto";

const state = globalThis.__socialChatWsState ?? {
  tokens: new Map(),
  sockets: new Map(),
};

globalThis.__socialChatWsState = state;

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of state.tokens.entries()) {
    if (entry.expiresAt <= now) {
      state.tokens.delete(token);
    }
  }
}

export function createChatSocketToken(userId) {
  cleanupExpiredTokens();
  const token = randomUUID();
  state.tokens.set(token, {
    userId,
    expiresAt: Date.now() + 60_000,
  });
  return token;
}

export function consumeChatSocketToken(token) {
  cleanupExpiredTokens();
  const entry = state.tokens.get(token);
  if (!entry) return null;

  state.tokens.delete(token);
  return entry.userId;
}

export function attachChatSocket(userId, socket) {
  const userSockets = state.sockets.get(userId) ?? new Set();
  userSockets.add(socket);
  state.sockets.set(userId, userSockets);
}

export function detachChatSocket(userId, socket) {
  const userSockets = state.sockets.get(userId);
  if (!userSockets) return;

  userSockets.delete(socket);
  if (userSockets.size === 0) {
    state.sockets.delete(userId);
  }
}

export function publishWebSocketChatEvent(userId, payload) {
  const userSockets = state.sockets.get(userId);
  if (!userSockets?.size) return;

  const message = JSON.stringify(payload);
  for (const socket of userSockets) {
    if (socket.readyState === 1) {
      socket.send(message);
    }
  }
}
