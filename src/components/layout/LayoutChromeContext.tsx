"use client";

import {
  createContext,
  type ReactNode,
  useEffect,
  useContext,
  useMemo,
  useState,
} from "react";

type LayoutChromeContextValue = {
  isSidebarOpen: boolean;
  isChatOpen: boolean;
  chatWidth: number;
  toggleSidebar: () => void;
  toggleChat: () => void;
  openChat: () => void;
  setChatWidth: (width: number) => void;
};

const LayoutChromeContext = createContext<LayoutChromeContextValue | null>(null);

export function LayoutChromeProvider({ children }: { children: ReactNode }) {
  // Wait for the browser viewport before enabling desktop chrome.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(360);

  useEffect(() => {
    const syncViewportChrome = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
      setIsChatOpen(window.innerWidth >= 1280);
    };

    syncViewportChrome();
    window.addEventListener("resize", syncViewportChrome);

    const storedWidth = window.localStorage.getItem("social-chat-width");
    if (storedWidth) {
      const parsed = Number(storedWidth);
      if (Number.isFinite(parsed)) {
        setChatWidth(Math.min(520, Math.max(320, Math.round(parsed))));
      }
    }

    return () => window.removeEventListener("resize", syncViewportChrome);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("social-chat-width", String(chatWidth));
  }, [chatWidth]);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      isChatOpen,
      chatWidth,
      toggleSidebar: () => setIsSidebarOpen((current) => !current),
      toggleChat: () => setIsChatOpen((current) => !current),
      openChat: () => setIsChatOpen(true),
      setChatWidth: (width: number) =>
        setChatWidth(Math.min(520, Math.max(320, Math.round(width)))),
    }),
    [chatWidth, isChatOpen, isSidebarOpen]
  );

  return (
    <LayoutChromeContext.Provider value={value}>
      {children}
    </LayoutChromeContext.Provider>
  );
}

export function useLayoutChrome() {
  const context = useContext(LayoutChromeContext);

  if (!context) {
    throw new Error("useLayoutChrome must be used within LayoutChromeProvider");
  }

  return context;
}
