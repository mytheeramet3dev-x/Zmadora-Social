"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";

type SidebarLayoutProps = {
  sidebar: ReactNode;
  rightRail?: ReactNode;
  children: ReactNode;
};

function SidebarLayout({ sidebar, rightRail, children }: SidebarLayoutProps) {
  const { isSidebarOpen, isChatOpen, chatWidth, setChatWidth } = useLayoutChrome();

  const gridClassName = useMemo(() => {
    return isSidebarOpen
      ? "lg:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]"
      : "lg:grid-cols-[minmax(0,1fr)]";
  }, [isSidebarOpen]);

  return (
    <div
      className={["grid grid-cols-1 items-start gap-0", gridClassName].join(" ")}
    >
      {isSidebarOpen ? (
        <aside className="hidden lg:block sticky top-0 h-screen shrink-0">
          {sidebar}
        </aside>
      ) : null}

      <div className="min-w-0">{children}</div>

      {rightRail && isChatOpen ? (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-22 sm:right-6 sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100dvh-120px)] sm:rounded-2xl sm:border border-border bg-background/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] sm:pt-0 pb-[env(safe-area-inset-bottom,0px)] sm:pb-0 animate-in fade-in zoom-in-95 sm:zoom-in-95 duration-200">
          {rightRail}
        </div>
      ) : null}
    </div>
  );
}

export default SidebarLayout;
