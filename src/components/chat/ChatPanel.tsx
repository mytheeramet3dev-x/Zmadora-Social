"use client";

import {
  getChatState,
  getConversation,
  markConversationAsRead,
  sendDirectMessage,
} from "@/actions/chat.action";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeftIcon,
  MessageCircleMoreIcon,
  PhoneIcon,
  SearchIcon,
  SendHorizonalIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { pusherClient } from "@/lib/pusher-client";
import { useCall } from "./CallProvider";

type ChatContact = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

type ChatState = {
  viewerUserId: string | null;
  contacts: ChatContact[];
  activeContactId: string | null;
  messages: ChatMessage[];
};

type ChatPanelProps = {
  initialState: ChatState;
};

type ChatSocketPayload = {
  type: "chat_message";
  contact: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  message: ChatMessage;
};

function formatMessageTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortContacts(items: ChatContact[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
    const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return (left.name || left.username).localeCompare(right.name || right.username);
  });
}

function emitUnreadCount(count: number) {
  window.dispatchEvent(
    new CustomEvent("social:chat-unread-count", {
      detail: { count },
    })
  );
}


function ChatPanel({ initialState }: ChatPanelProps) {
  const { toggleChat } = useLayoutChrome();
  const { startCall } = useCall();
  const [contacts, setContacts] = useState(initialState.contacts);
  const [viewerUserId, setViewerUserId] = useState(initialState.viewerUserId);
  const [activeContactId, setActiveContactId] = useState<string | null>(
    initialState.activeContactId
  );
  const [messagesByContact, setMessagesByContact] = useState<Record<string, ChatMessage[]>>(
    initialState.activeContactId
      ? { [initialState.activeContactId]: initialState.messages }
      : {}
  );
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isSendPending, startSendTransition] = useTransition();
  const activeContactIdRef = useRef<string | null>(initialState.activeContactId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(80);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // On mobile screen width (< 1280px), start at the contacts list rather than trapping user in contact 1
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setActiveContactId(null);
      activeContactIdRef.current = null;
    }
  }, []);

  // Lock body scroll when mobile chat overlay is open
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      let newWidth = e.clientX - rect.left;

      if (newWidth < 140) newWidth = 80;
      else if (newWidth < 240) newWidth = 240;
      else if (newWidth > 480) newWidth = 480;

      // Update DOM directly for smooth 60fps dragging
      sidebarRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
        
        // Finalize state to match DOM
        if (sidebarRef.current) {
            const currentWidth = parseInt(sidebarRef.current.style.width, 10);
            if (!isNaN(currentWidth)) {
                setSidebarWidth(currentWidth);
            }
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const isCollapsed = sidebarWidth <= 100;

  const handleSelectContact = useCallback(async (contactId: string) => {
    setActiveContactId(contactId);
    activeContactIdRef.current = contactId;

    // Immediately clear unread count for this contact locally
    setContacts((current) =>
      current.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
    );

    // Fetch conversation messages in background if not already loaded or to refresh
    const res = await getConversation(contactId);
    if (res.success && activeContactIdRef.current === contactId) {
      setMessagesByContact((current) => ({
        ...current,
        [contactId]: res.messages,
      }));
    }
  }, []);

  const filteredContacts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return contacts;

    return contacts.filter((contact) => {
      return (
        (contact.name || "").toLowerCase().includes(normalized) ||
        contact.username.toLowerCase().includes(normalized)
      );
    });
  }, [contacts, search]);

  const activeContact =
    filteredContacts.find((contact) => contact.id === activeContactId) ||
    contacts.find((contact) => contact.id === activeContactId) ||
    null;

  const activeMessages = activeContactId ? messagesByContact[activeContactId] || [] : [];

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeMessages.length, activeContactId]);

  useEffect(() => {
    emitUnreadCount(contacts.reduce((sum, contact) => sum + contact.unreadCount, 0));
  }, [contacts]);

  useEffect(() => {
    if (!viewerUserId) return;

    const channel = pusherClient.subscribe(`user-${viewerUserId}`);

    const handleChatEvent = (payload: ChatSocketPayload) => {
      if (payload.type !== "chat_message") return;

      const isSender = payload.message.senderId === viewerUserId;
      const resolvedContactId = isSender
        ? payload.message.receiverId
        : payload.message.senderId;
      const shouldAppendToOpenThread =
        activeContactIdRef.current === resolvedContactId;

      // 1. Update contacts list with correct resolved contact identity and unread count
      setContacts((current) => {
        const existing = current.find((contact) => contact.id === resolvedContactId);
        const nextUnread = isSender
          ? existing?.unreadCount || 0
          : shouldAppendToOpenThread
          ? 0
          : (existing?.unreadCount || 0) + 1;

        return sortContacts([
          ...current.filter((contact) => contact.id !== resolvedContactId),
          {
            id: payload.contact.id,
            name: payload.contact.name,
            username: payload.contact.username,
            image: payload.contact.image,
            lastMessage: payload.message.content,
            lastMessageAt: payload.message.createdAt,
            unreadCount: nextUnread,
          },
        ]);
      });

      // 2. Reconcile message in thread (prevent duplicates from Pusher echo or out-of-order responses)
      setMessagesByContact((current) => {
        const thread = current[resolvedContactId] || [];

        // If message with real ID already exists, do not duplicate
        if (thread.some((message) => message.id === payload.message.id)) {
          return current;
        }

        // If sender echo arrives before server action response, reconcile with matching optimistic temp message
        if (isSender) {
          const tempIndex = thread.findIndex(
            (m) =>
              m.id.startsWith("temp-") &&
              m.senderId === viewerUserId &&
              m.receiverId === resolvedContactId &&
              m.content === payload.message.content
          );

          if (tempIndex !== -1) {
            const nextThread = [...thread];
            nextThread[tempIndex] = payload.message;
            return {
              ...current,
              [resolvedContactId]: nextThread,
            };
          }
        }

        // If open thread or cached, append message
        return {
          ...current,
          [resolvedContactId]: shouldAppendToOpenThread
            ? [...thread, payload.message]
            : thread,
        };
      });

      // 3. Mark read in background if open thread and received from other user
      if (shouldAppendToOpenThread && !isSender) {
        void markConversationAsRead(resolvedContactId);
      }
    };

    channel.bind("chat-event", handleChatEvent);

    return () => {
      channel.unbind("chat-event", handleChatEvent);
    };
  }, [viewerUserId]);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string;
        name: string | null;
        username: string;
        image: string | null;
      }>;
      const incomingContact = customEvent.detail;

      if (!incomingContact) return;

      setContacts((current) => {
        const exists = current.some((contact) => contact.id === incomingContact.id);
        return exists
          ? current
          : sortContacts([
              {
                ...incomingContact,
                lastMessage: null,
                lastMessageAt: null,
                unreadCount: 0,
              },
              ...current,
            ]);
      });
      setSearch("");
      void handleSelectContact(incomingContact.id);
    };

    window.addEventListener("social:open-chat", handleOpenChat as EventListener);
    return () =>
      window.removeEventListener("social:open-chat", handleOpenChat as EventListener);
  }, [handleSelectContact]);

  const handleSend = () => {
    const normalized = draft.trim();
    if (!normalized || !activeContactId || !viewerUserId) return;

    const targetContactId = activeContactId;
    const clientMessageId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: ChatMessage = {
      id: clientMessageId,
      senderId: viewerUserId,
      receiverId: targetContactId,
      content: normalized,
      createdAt: new Date().toISOString(),
    };

    // Capture target contact state before optimistic mutation
    const targetContact = contacts.find((c) => c.id === targetContactId);
    const previousLastMessage = targetContact?.lastMessage ?? null;
    const previousLastMessageAt = targetContact?.lastMessageAt ?? null;

    setMessagesByContact((current) => ({
      ...current,
      [targetContactId]: [...(current[targetContactId] || []), optimisticMessage],
    }));

    setContacts((current) =>
      sortContacts(
        current.map((contact) =>
          contact.id === targetContactId
            ? {
                ...contact,
                lastMessage: normalized,
                lastMessageAt: optimisticMessage.createdAt,
              }
            : contact
        )
      )
    );
    setDraft("");

    startSendTransition(async () => {
      const result = await sendDirectMessage(targetContactId, normalized);
      if (!result.success) {
        // Rollback only the failed optimistic message
        setMessagesByContact((current) => ({
          ...current,
          [targetContactId]: (current[targetContactId] || []).filter(
            (message) => message.id !== clientMessageId
          ),
        }));

        // Restore target contact's previous lastMessage only if it hasn't been superseded by a newer message
        setContacts((current) =>
          sortContacts(
            current.map((contact) => {
              if (
                contact.id === targetContactId &&
                contact.lastMessageAt === optimisticMessage.createdAt
              ) {
                return {
                  ...contact,
                  lastMessage: previousLastMessage,
                  lastMessageAt: previousLastMessageAt,
                };
              }
              return contact;
            })
          )
        );

        toast.error(result.error || "Failed to send message");
        return;
      }

      // Reconcile temporary message with real server message (prevent duplicate if Pusher echo arrived first)
      if (result.message) {
        setMessagesByContact((current) => {
          const thread = current[targetContactId] || [];
          const hasRealMessage = thread.some((m) => m.id === result.message!.id);
          if (hasRealMessage) {
            return {
              ...current,
              [targetContactId]: thread.filter((m) => m.id !== clientMessageId),
            };
          }

          return {
            ...current,
            [targetContactId]: thread.map((m) =>
              m.id === clientMessageId ? (result.message as ChatMessage) : m
            ),
          };
        });
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-md overflow-hidden text-foreground">
      {activeContact ? (
        /* Conversation Detail View */
        <div className="h-full w-full flex flex-col min-h-0">
          {/* Conversation Header */}
          <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2.5 bg-card/80 backdrop-blur-md shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              {/* Back button to contacts list */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveContactId(null)}
                className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Back to contacts"
                title="Back to contacts"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>

              <Avatar className="h-8 w-8 border border-border shrink-0">
                <AvatarImage src={activeContact.image || "/avatar.png"} />
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs sm:text-sm font-semibold text-foreground leading-tight">
                  {activeContact.name || activeContact.username}
                </p>
                <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">@{activeContact.username}</p>
              </div>
            </div>

            {/* Header Action Buttons: Audio Call, Video Call, Close */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
              <Button
                type="button"
                onClick={() => startCall(activeContact.id, "AUDIO")}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-full gap-1 text-xs font-medium border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-xs"
                title="Audio Call"
                aria-label="Audio call"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-primary group-hover:text-primary-foreground" />
                <span className="hidden sm:inline text-[11px]">Call</span>
              </Button>

              <Button
                type="button"
                onClick={() => startCall(activeContact.id, "VIDEO")}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-full gap-1 text-xs font-medium border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-xs"
                title="Video Call"
                aria-label="Video call"
              >
                <VideoIcon className="h-3.5 w-3.5 text-primary group-hover:text-primary-foreground" />
                <span className="hidden sm:inline text-[11px]">Video</span>
              </Button>

              {/* Minimize / Close button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors ml-0.5"
                aria-label="Close chat"
                title="Close chat"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-2.5">
            {activeMessages.length > 0 ? (
              activeMessages.map((message) => {
                const isMine = message.senderId === viewerUserId;

                return (
                  <div
                    key={message.id}
                    className={isMine ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={[
                        "max-w-[82%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-xs",
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted text-foreground border border-border/50 rounded-bl-xs",
                      ].join(" ")}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={[
                          "mt-1 text-[9px] sm:text-[10px]",
                          isMine ? "text-primary-foreground/75" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-8 text-center my-auto">
                <MessageCircleMoreIcon className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Send a message to start chatting with {activeContact.name || activeContact.username}.
                </p>
              </div>
            )}
          </div>

          {/* Input & Send Area */}
          <div className="border-t border-border p-2.5 sm:p-3 bg-card/60 backdrop-blur-xs shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background/80 p-1.5 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${activeContact.name || activeContact.username}...`}
                className="min-h-[44px] max-h-[120px] text-xs sm:text-sm border-none bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 resize-none leading-relaxed"
                disabled={isSendPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim() || isSendPending}
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0 shadow-none"
                aria-label="Send message"
              >
                <SendHorizonalIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Contacts List View */
        <div className="h-full w-full flex flex-col min-h-0">
          {/* Header */}
          <div className="border-b border-border p-3.5 sm:p-4 bg-card/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Messages</p>
                <div className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {contacts.length}
                </div>
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                aria-label="Close chat"
                title="Close chat"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Box */}
            <div className="mt-3 flex h-9 items-center rounded-lg border border-border bg-background px-3 focus-within:ring-1 focus-within:ring-primary/40">
              <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contacts..."
                className="w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Contact Items List (Clean: NO outside call buttons) */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0 space-y-1">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact.id)}
                  className="relative flex items-center justify-between gap-3 w-full rounded-xl p-2.5 text-left transition-colors cursor-pointer hover:bg-accent/70 group"
                >
                  <Avatar className="h-10 w-10 border border-border shrink-0">
                    <AvatarImage src={contact.image || "/avatar.png"} />
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {contact.name || contact.username}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {contact.lastMessage || "Tap to start chatting"}
                    </p>
                  </div>

                  {contact.unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0 shadow-xs">
                      {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UsersIcon className="h-7 w-7 opacity-30 mb-2" />
                <p className="text-xs">No contacts found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
