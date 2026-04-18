"use client";

import { getChatState, sendDirectMessage } from "@/actions/chat.action";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircleMoreIcon,
  PhoneIcon,
  SearchIcon,
  SendHorizonalIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { pusherClient } from "@/lib/pusher-client";

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
  useLayoutChrome();
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

  const [sidebarWidth, setSidebarWidth] = useState(80);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

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

  const syncChatState = useCallback(async (contactId?: string | null) => {
    const nextState = await getChatState(contactId ?? activeContactIdRef.current);
    setViewerUserId(nextState.viewerUserId);
    setContacts(sortContacts(nextState.contacts));
    setActiveContactId(nextState.activeContactId);
    activeContactIdRef.current = nextState.activeContactId;

    if (nextState.activeContactId) {
      setMessagesByContact((current) => ({
        ...current,
        [nextState.activeContactId as string]: nextState.messages,
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
    emitUnreadCount(contacts.reduce((sum, contact) => sum + contact.unreadCount, 0));
  }, [contacts]);

  useEffect(() => {
    if (!activeContactId) return;
    activeContactIdRef.current = activeContactId;
    void syncChatState(activeContactId);
  }, [activeContactId, syncChatState]);

  useEffect(() => {
    if (!viewerUserId) return;

    const channel = pusherClient.subscribe(`user-${viewerUserId}`);

    const handleChatEvent = (payload: ChatSocketPayload) => {
      if (payload.type !== "chat_message") return;

      const incomingContactId = payload.message.senderId;
      const shouldAppendToOpenThread = activeContactIdRef.current === incomingContactId;

      setContacts((current) =>
        sortContacts([
          ...current.filter((contact) => contact.id !== incomingContactId),
          {
            id: payload.contact.id,
            name: payload.contact.name,
            username: payload.contact.username,
            image: payload.contact.image,
            lastMessage: payload.message.content,
            lastMessageAt: payload.message.createdAt,
            unreadCount: shouldAppendToOpenThread
              ? 0
              : (current.find((contact) => contact.id === incomingContactId)?.unreadCount || 0) + 1,
          },
        ])
      );

      setMessagesByContact((current) => {
        const thread = current[incomingContactId] || [];
        if (thread.some((message) => message.id === payload.message.id)) {
          return current;
        }
        return {
          ...current,
          [incomingContactId]: shouldAppendToOpenThread
            ? [...thread, payload.message]
            : thread,
        };
      });

      if (shouldAppendToOpenThread) {
        void syncChatState(incomingContactId);
      }
    };

    channel.bind("chat-event", handleChatEvent);

    return () => {
      channel.unbind("chat-event", handleChatEvent);
      pusherClient.unsubscribe(`user-${viewerUserId}`);
    };
  }, [syncChatState, viewerUserId]);

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
      setActiveContactId(incomingContact.id);
      activeContactIdRef.current = incomingContact.id;
      setSearch("");
      void syncChatState(incomingContact.id);
    };

    window.addEventListener("social:open-chat", handleOpenChat as EventListener);
    return () =>
      window.removeEventListener("social:open-chat", handleOpenChat as EventListener);
  }, [syncChatState]);

  const handleSend = () => {
    const normalized = draft.trim();
    if (!normalized || !activeContactId || !viewerUserId) return;

    const clientMessageId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: ChatMessage = {
      id: clientMessageId,
      senderId: viewerUserId,
      receiverId: activeContactId,
      content: normalized,
      createdAt: new Date().toISOString(),
    };

    setMessagesByContact((current) => ({
      ...current,
      [activeContactId]: [...(current[activeContactId] || []), optimisticMessage],
    }));
    setContacts((current) =>
      sortContacts(
        current.map((contact) =>
          contact.id === activeContactId
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
      const result = await sendDirectMessage(activeContactId, normalized);
      if (!result.success) {
        // Rollback optimistic message on error
        setMessagesByContact((current) => ({
          ...current,
          [activeContactId]: (current[activeContactId] || []).filter(
            (message) => message.id !== clientMessageId
          ),
        }));
        toast.error(result.error || "Failed to send message");
        return;
      }
      // Replace optimistic message with the real one from the server
      if (result.message) {
        setMessagesByContact((current) => ({
          ...current,
          [activeContactId]: (current[activeContactId] || []).map((message) =>
            message.id === clientMessageId ? (result.message as ChatMessage) : message
          ),
        }));
      }
    });
  };

  return (
    <div className="hidden xl:block">
      <div className="sticky top-20 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex min-h-[42rem]">
          <div
            ref={sidebarRef}
            style={{ width: sidebarWidth }}
            className="relative flex flex-col border-r border-border shrink-0"
          >
            <div className="border-b border-border p-4">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                  <div>
                    <p className="text-sm font-semibold">Messages</p>
                  </div>
                )}
                <div className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                  {contacts.length}
                </div>
              </div>

              {!isCollapsed && (
                <div className="mt-4 flex h-10 items-center rounded-full border border-border bg-muted/50 px-3">
                  <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search contacts"
                    className="w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3">
              <div className="space-y-2">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => {
                    const isActive = contact.id === activeContact?.id;

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setActiveContactId(contact.id)}
                        className={[
                          "relative flex items-center gap-3 w-full rounded-2xl p-2 text-left transition",
                          isActive ? "bg-muted" : "hover:bg-muted/50",
                          isCollapsed ? "justify-center" : "",
                        ].join(" ")}
                        title={isCollapsed ? (contact.name || contact.username) : undefined}
                      >
                        <Avatar className={`border border-border shrink-0 ${isCollapsed ? 'h-10 w-10' : 'h-11 w-11'}`}>
                          <AvatarImage src={contact.image || "/avatar.png"} />
                        </Avatar>
                        {!isCollapsed && (
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {contact.name || contact.username}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                              {contact.lastMessage || "Tap to start chatting"}
                            </p>
                          </div>
                        )}
                        {contact.unreadCount > 0 ? (
                          <span className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white ${isCollapsed ? 'top-1 right-1' : 'top-2 right-2'}`}>
                            {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <UsersIcon className={`h-8 w-8 opacity-20 ${!isCollapsed && 'mb-3'}`} />
                    {!isCollapsed && <p className="text-xs">No contacts found</p>}
                  </div>
                )}
              </div>
            </div>

            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors"
              onMouseDown={handleMouseDown}
            />
          </div>

          <div className="flex flex-1 min-w-0 flex-col">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                      <AvatarImage src={activeContact.image || "/avatar.png"} />
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">
                        {activeContact.name || activeContact.username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{activeContact.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <PhoneIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <VideoIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {activeMessages.length > 0 ? (
                    <div className="space-y-3">
                      {activeMessages.map((message) => {
                        const isMine = message.senderId === viewerUserId;

                        return (
                          <div
                            key={message.id}
                            className={isMine ? "flex justify-end" : "flex justify-start"}
                          >
                            <div
                              className={[
                                "max-w-[85%] rounded-3xl px-4 py-3 text-sm",
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground",
                              ].join(" ")}
                            >
                              <p className="leading-6">{message.content}</p>
                              <p
                                className={[
                                  "mt-1 text-[11px]",
                                  isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                                ].join(" ")}
                              >
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-muted/30 px-6 text-center">
                      <MessageCircleMoreIcon className="h-6 w-6 text-sky-400" />
                      <p className="mt-3 text-sm font-medium">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Start the conversation with {activeContact.name || activeContact.username}.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border px-4 py-4">
                  <div className="rounded-[24px] border border-border bg-muted/50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageCircleMoreIcon className="h-3.5 w-3.5" />
                      Send a new message
                    </div>
                    <div className="flex items-end gap-3">
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={`Message ${activeContact.name || activeContact.username}...`}
                        className="min-h-[84px] border-none bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
                        disabled={isSendPending}
                      />
                      <Button
                        type="button"
                        onClick={handleSend}
                        disabled={!draft.trim() || isSendPending}
                        className="h-11 w-11 rounded-full p-0"
                      >
                        <SendHorizonalIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                No contacts available for chat right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
