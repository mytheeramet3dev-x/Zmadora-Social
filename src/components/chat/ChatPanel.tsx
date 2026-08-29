"use client";

import { getChatState, getConversation, sendDirectMessage } from "@/actions/chat.action";
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
    emitUnreadCount(contacts.reduce((sum, contact) => sum + contact.unreadCount, 0));
  }, [contacts]);

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
        // Just mark read on server in background
        void getConversation(incomingContactId);
      }
    };

    channel.bind("chat-event", handleChatEvent);

    return () => {
      channel.unbind("chat-event", handleChatEvent);
      pusherClient.unsubscribe(`user-${viewerUserId}`);
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

    const clientMessageId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: ChatMessage = {
      id: clientMessageId,
      senderId: viewerUserId,
      receiverId: activeContactId,
      content: normalized,
      createdAt: new Date().toISOString(),
    };

    const previousContacts = contacts;
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
        // Rollback optimistic message AND contacts on error
        setMessagesByContact((current) => ({
          ...current,
          [activeContactId]: (current[activeContactId] || []).filter(
            (message) => message.id !== clientMessageId
          ),
        }));
        setContacts(previousContacts);
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
    <div className="h-full xl:py-4 xl:pl-3">
      <div className="h-full xl:h-[calc(100vh-2rem)] overflow-hidden xl:rounded-2xl xl:border border-border bg-background shadow-sm flex flex-col">
        <div className="flex flex-1 min-h-0">
          {/* Contacts Sidebar Column */}
          <div
            ref={sidebarRef}
            style={{ width: undefined }}
            className={`relative flex-col border-r border-border shrink-0 h-full ${
              activeContact ? "hidden xl:flex" : "flex w-full"
            } xl:w-[var(--sidebar-w,80px)]`}
          >
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Messages</p>
                  <div className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                    {contacts.length}
                  </div>
                </div>

                {/* Mobile Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleChat}
                  className="h-8 w-8 rounded-full xl:hidden"
                  aria-label="Close chat"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex h-9 items-center rounded-md border border-border bg-background px-3">
                <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="space-y-1">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => {
                    const isActive = contact.id === activeContact?.id;

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact.id)}
                        className={[
                          "relative flex items-center gap-2.5 w-full rounded-md p-2 text-left transition-colors",
                          isActive ? "bg-accent text-foreground" : "hover:bg-accent/50 text-foreground/80",
                          isCollapsed ? "xl:justify-center" : "",
                        ].join(" ")}
                        title={isCollapsed ? (contact.name || contact.username) : undefined}
                      >
                        <Avatar className={`border border-border shrink-0 ${isCollapsed ? 'xl:h-8 xl:w-8 h-9 w-9' : 'h-9 w-9'}`}>
                          <AvatarImage src={contact.image || "/avatar.png"} />
                        </Avatar>
                        <div className={`min-w-0 flex-1 ${isCollapsed ? 'xl:hidden' : 'block'}`}>
                          <p className="truncate text-xs font-semibold text-foreground">
                            {contact.name || contact.username}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                            {contact.lastMessage || "Tap to start chatting"}
                          </p>
                        </div>
                        {contact.unreadCount > 0 ? (
                          <span className="absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground top-2 right-2">
                            {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <UsersIcon className="h-6 w-6 opacity-30 mb-2" />
                    <p className="text-xs">No contacts found</p>
                  </div>
                )}
              </div>
            </div>

            <div
              className="hidden xl:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors"
              onMouseDown={handleMouseDown}
            />
          </div>

          {/* Conversation Detail Column */}
          <div className={`flex-1 min-w-0 flex-col ${activeContact ? "flex" : "hidden xl:flex"}`}>
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Mobile Back Button to Contacts List */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveContactId(null)}
                      className="h-8 w-8 rounded-md xl:hidden shrink-0"
                      aria-label="Back to contacts"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                    </Button>

                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0">
                      <AvatarImage src={activeContact.image || "/avatar.png"} />
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold">
                        {activeContact.name || activeContact.username}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">@{activeContact.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <Button 
                      onClick={() => startCall(activeContact.id, "AUDIO")}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                      title="Audio Call"
                      aria-label="Audio call"
                    >
                      <PhoneIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => startCall(activeContact.id, "VIDEO")}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                      title="Video Call"
                      aria-label="Video call"
                    >
                      <VideoIcon className="h-4 w-4" />
                    </Button>
                    {/* Mobile Close Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleChat}
                      className="h-8 w-8 rounded-md xl:hidden"
                      aria-label="Close chat"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {activeMessages.length > 0 ? (
                    <div className="space-y-2.5">
                      {activeMessages.map((message) => {
                        const isMine = message.senderId === viewerUserId;

                        return (
                          <div
                            key={message.id}
                            className={isMine ? "flex justify-end" : "flex justify-start"}
                          >
                            <div
                              className={[
                                "max-w-[85%] rounded-md px-3.5 py-2 text-sm leading-relaxed",
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground border border-border/50",
                              ].join(" ")}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p
                                className={[
                                  "mt-1 text-[10px]",
                                  isMine ? "text-primary-foreground/75" : "text-muted-foreground",
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
                    <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/10 px-6 py-8 text-center">
                      <MessageCircleMoreIcon className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Start the conversation with {activeContact.name || activeContact.username}.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border px-3 sm:px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                  <div className="rounded-md border border-border bg-card p-2.5">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={`Message ${activeContact.name || activeContact.username}...`}
                        className="min-h-[50px] sm:min-h-[64px] text-xs sm:text-sm border-none bg-transparent px-1 py-1 shadow-none focus-visible:ring-0 resize-none leading-relaxed"
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
                        size="sm"
                        className="h-8 px-3 rounded-md shrink-0 font-medium shadow-none"
                        aria-label="Send message"
                      >
                        <SendHorizonalIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                Select a contact to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
