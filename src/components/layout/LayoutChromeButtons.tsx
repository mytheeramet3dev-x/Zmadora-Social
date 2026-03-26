"use client";

import { MessageCircleIcon, MenuIcon } from "lucide-react";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type LayoutChromeButtonsProps = {
  showChatToggle?: boolean;
  initialUnreadCount?: number;
};

function LayoutChromeButtons({
  showChatToggle = true,
  initialUnreadCount = 0,
}: LayoutChromeButtonsProps) {
  const { isSidebarOpen, isChatOpen, toggleSidebar, toggleChat } = useLayoutChrome();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    if (!showChatToggle) return;

    const handleUnreadCount = (event: Event) => {
      const customEvent = event as CustomEvent<{ count: number }>;
      setUnreadCount(Math.max(0, customEvent.detail?.count ?? 0));
    };

    window.addEventListener(
      "social:chat-unread-count",
      handleUnreadCount as EventListener
    );

    return () => {
      window.removeEventListener(
        "social:chat-unread-count",
        handleUnreadCount as EventListener
      );
    };
  }, [showChatToggle]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        className="h-10 w-10 rounded-full"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>

      {showChatToggle ? (
        <Button
          type="button"
          variant={isChatOpen ? "outline" : "ghost"}
          size="icon"
          onClick={toggleChat}
          aria-label={isChatOpen ? "Hide chat" : "Show chat"}
          className="relative hidden h-10 w-10 rounded-full xl:inline-flex"
        >
          <MessageCircleIcon className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white shadow-lg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      ) : null}
    </div>
  );
}

export default LayoutChromeButtons;
