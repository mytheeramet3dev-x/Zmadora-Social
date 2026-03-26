"use client";

import { getChatState } from "@/actions/chat.action";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircleMoreIcon,
  PhoneIcon,
  SearchIcon,
  SendHorizonalIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

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

type ChatSocketPayload =
  | {
      type: "connected";
      userId: string;
    }
  | {
      type: "chat_message";
      contact: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
      };
      message: ChatMessage;
    }
  | {
      type: "message_sent";
      clientMessageId: string;
      contact: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
      };
      message: ChatMessage;
    }
  | {
      type: "message_error";
      clientMessageId?: string;
      error: string;
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

async function getChatSocketUrl() {
  const response = await fetch("/api/chat/socket-token", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create chat socket token");
  }

  const payload = (await response.json()) as { token: string };
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/chat/ws?token=${payload.token}`;
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
  const reconnectTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

    let cancelled = false;

    const connect = async () => {
      try {
        const socketUrl = await getChatSocketUrl();
        if (cancelled) return;

        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data) as ChatSocketPayload;

          if (payload.type === "connected") {
            return;
          }

          if (payload.type === "message_error") {
            if (payload.clientMessageId && activeContactIdRef.current) {
              setMessagesByContact((current) => ({
                ...current,
                [activeContactIdRef.current as string]: (current[activeContactIdRef.current as string] || []).filter(
                  (message) => message.id !== payload.clientMessageId
                ),
              }));
            }
            toast.error(payload.error || "Failed to send message");
            return;
          }

          if (payload.type === "message_sent") {
            const contactId = payload.message.receiverId;
            setMessagesByContact((current) => ({
              ...current,
              [contactId]: (current[contactId] || []).map((message) =>
                message.id === payload.clientMessageId ? payload.message : message
              ),
            }));
            setContacts((current) =>
              sortContacts(
                current.map((contact) =>
                  contact.id === contactId
                    ? {
                        ...contact,
                        lastMessage: payload.message.content,
                        lastMessageAt: payload.message.createdAt,
                      }
                    : contact
                )
              )
            );
            return;
          }

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

        socket.onclose = () => {
          if (cancelled) return;
          socketRef.current = null;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            void connect();
          }, 1500);
        };
      } catch {
        if (cancelled) return;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          void connect();
        }, 2000);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
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

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error("Chat connection is not ready yet");
      return;
    }

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

    startSendTransition(() => {
      socket.send(
        JSON.stringify({
          type: "send_message",
          clientMessageId,
          receiverId: activeContactId,
          content: normalized,
        })
      );
    });
  };

  return (
    <div className="hidden xl:block">
      <div className="glass-panel sticky top-20 overflow-hidden rounded-[30px]">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Messages</p>
              <p className="text-xs text-muted-foreground">
                Live chat over WebSocket with instant delivery
              </p>
            </div>
            <div className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300">
              {contacts.length} contacts
            </div>
          </div>

          <div className="glass-surface mt-4 flex h-10 items-center rounded-full px-3">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts"
              className="w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid min-h-[42rem] grid-cols-[132px_minmax(0,1fr)]">
          <div className="border-r border-white/10 px-2 py-3">
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
                        "relative w-full rounded-2xl px-3 py-3 text-left transition",
                        isActive
                          ? "bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                          : "hover:bg-white/10",
                      ].join(" ")}
                    >
                      <Avatar className="mx-auto h-11 w-11 border border-white/30">
                        <AvatarImage src={contact.image || "/avatar.png"} />
                      </Avatar>
                      <p className="mt-2 truncate text-xs font-medium">
                        {contact.name || contact.username}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        @{contact.username}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                        {contact.lastMessage || "Tap to start chatting"}
                      </p>
                      {contact.unreadCount > 0 ? (
                        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white">
                          {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-white/10 px-3 py-4 text-center text-xs text-muted-foreground">
                  No contacts found
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-white/30">
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
                                  ? "bg-sky-500 text-sky-950"
                                  : "bg-white/10 text-foreground",
                              ].join(" ")}
                            >
                              <p className="leading-6">{message.content}</p>
                              <p
                                className={[
                                  "mt-1 text-[11px]",
                                  isMine ? "text-sky-950/70" : "text-muted-foreground",
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
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/6 px-6 text-center">
                      <MessageCircleMoreIcon className="h-6 w-6 text-sky-400" />
                      <p className="mt-3 text-sm font-medium">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Start the conversation with {activeContact.name || activeContact.username}.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 px-4 py-4">
                  <div className="rounded-[24px] border border-white/15 bg-white/10 p-3">
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
