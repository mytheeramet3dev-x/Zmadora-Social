# Architecture

## Overview

Zmadora is a full-stack social app built on top of Next.js App Router.

The architecture is split into four main layers:

1. UI layer
2. server-side action layer
3. route handler / realtime layer
4. database layer

## 1. UI Layer

Key UI areas:

- `src/app/` for layout and routed pages
- `src/components/` for feature components and UI primitives
- `src/components/ui/` for lower-level reusable building blocks

Important feature components:

- `CreatePost.tsx`
- `PostCard.tsx`
- `FeedList.tsx`
- `ProfileFeedList.tsx`
- `ChatPanel.tsx`
- `NotificationBell.tsx`
- `ProfileHeaderPanel.tsx`

## 2. Server Action Layer

Business logic is primarily implemented in:

- `src/actions/user.action.ts`
- `src/actions/post.action.ts`
- `src/actions/chat.action.ts`
- `src/actions/notification.action.ts`

These actions are responsible for:

- user/profile workflows
- post creation and interaction
- comments and replies
- follow relationships
- notifications
- chat state reads

This project intentionally uses Server Actions rather than exposing a full REST API for every mutation.

## 3. Realtime / Route Layer

### SSE

Used for:

- feed updates
- notification updates

Relevant files:

- `src/app/api/feed/stream/route.ts`
- `src/app/api/notifications/stream/route.ts`
- `src/lib/feed-events.ts`
- `src/lib/notification-events.ts`

### WebSocket

Used for:

- chat delivery
- WebSocket message sending

Relevant files:

- `server.mjs`
- `src/lib/chat-ws-state.js`
- `src/lib/chat-ws-service.js`
- `src/app/api/chat/socket-token/route.ts`
- `src/components/ChatPanel.tsx`

## 4. Database Layer

Database access is handled through Prisma and PostgreSQL.

Relevant files:

- `prisma/schema.prisma`
- `src/lib/prisma.ts`

Main models:

- `User`
- `Post`
- `Comment`
- `Like`
- `CommentLike`
- `Follows`
- `Notification`
- `DirectMessage`

## Authentication

Authentication is provided by Clerk.

Relevant files:

- `src/middleware.ts`
- `src/actions/user.action.ts`
- `src/app/layout.tsx`

Clerk protects the application and provides authenticated user context, while application-specific user data is persisted in PostgreSQL.

## Client-First Interaction Strategy

The UI favors optimistic updates for frequent interactions:

- follow/unfollow
- likes
- comments
- replies
- profile updates
- chat messages

The client updates first for responsiveness, while the server confirms and persists the final state.

## Tradeoffs

### Pros

- fast user feedback
- clean full-stack developer experience
- tight integration with App Router and Server Actions
- relatively low complexity for an MVP

### Current tradeoffs

- realtime fan-out is still in-memory
- uploads are local filesystem based
- not yet optimized for multi-instance production deployment
