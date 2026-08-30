"use client";

import { useEffect, useState } from "react";
import { MessageCircleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";

type MobileChatFABProps = {
  initialUnreadCount?: number;
};

export default function MobileChatFAB({ initialUnreadCount = 0 }: MobileChatFABProps) {
  const { toggleChat, isChatOpen } = useLayoutChrome();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    const handleUnreadUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ count: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setUnreadCount(customEvent.detail.count);
      }
    };

    window.addEventListener("social:chat-unread-count", handleUnreadUpdate);
    return () => {
      window.removeEventListener("social:chat-unread-count", handleUnreadUpdate);
    };
  }, []);

  return (
    <Button
      type="button"
      size="icon"
      onClick={toggleChat}
      aria-label={isChatOpen ? "Close chat" : "Open chat"}
      className={`fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 h-12 w-12 md:h-13 md:w-13 rounded-full shadow-2xl transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer ${
        isChatOpen
          ? "hidden sm:flex z-[10000] bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-4 ring-background"
          : "z-40 bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {isChatOpen ? (
          <XIcon className="h-5 w-5" />
        ) : (
          <MessageCircleIcon className="h-5 w-5" />
        )}

        {!isChatOpen && unreadCount > 0 && (
          <span className="absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </Button>
  );
}
