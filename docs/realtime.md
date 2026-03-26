# Realtime Design

## Overview

Zmadora uses two realtime mechanisms:

- SSE for feed and notifications
- WebSocket for chat

This split keeps feed/notification flows simple while giving chat a true bidirectional transport.

## Feed Realtime

Feed updates are published through an in-memory SSE event hub.

Used for:

- new posts
- post updates after likes/comments/replies
- post deletion

Relevant files:

- `src/lib/feed-events.ts`
- `src/app/api/feed/stream/route.ts`
- `src/components/FeedList.tsx`
- `src/components/ProfileFeedList.tsx`

## Notification Realtime

Notification updates are also published via SSE.

Used for:

- follow notifications
- post like notifications
- comment/reply notifications
- message notifications in the notification center

Relevant files:

- `src/lib/notification-events.ts`
- `src/app/api/notifications/stream/route.ts`
- `src/components/NotificationBell.tsx`

## Chat Realtime

Chat now uses WebSocket for both:

- receiving new chat messages
- sending messages from the client to the server

Flow:

1. client requests a short-lived socket token from `/api/chat/socket-token`
2. client opens a WebSocket connection to `/api/chat/ws?token=...`
3. server validates the token during upgrade
4. client sends `send_message` payloads over the socket
5. server writes the message and notification to PostgreSQL
6. sender receives `message_sent` ack
7. receiver receives `chat_message` push immediately

Relevant files:

- `server.mjs`
- `src/lib/chat-ws-state.js`
- `src/lib/chat-ws-service.js`
- `src/app/api/chat/socket-token/route.ts`
- `src/components/ChatPanel.tsx`

## Why not use only WebSocket everywhere?

Because the app currently benefits from a simpler split:

- feed and notifications are mostly server-to-client updates, so SSE is straightforward
- chat is truly bidirectional and benefits more from WebSocket

## Current Limitations

- WebSocket client tracking is stored in memory
- SSE listeners are stored in memory
- this is suitable for local development and single-instance deployment
- it is not yet designed for horizontal scaling across multiple instances

## Future Upgrades

To make realtime production-grade across multiple instances, move event distribution to shared infrastructure such as:

- Redis pub/sub
- Pusher
- Ably
- a dedicated WebSocket gateway
