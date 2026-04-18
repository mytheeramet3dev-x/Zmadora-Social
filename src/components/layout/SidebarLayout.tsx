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
    if (!rightRail) {
      return isSidebarOpen
        ? "lg:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]"
        : "lg:grid-cols-[minmax(0,1fr)]";
    }

    if (isSidebarOpen && isChatOpen) {
      return "lg:grid-cols-[80px_minmax(0,1fr)] xl:[grid-template-columns:260px_minmax(0,1fr)_var(--chat-width)]";
    }

    if (isSidebarOpen && !isChatOpen) {
      return "lg:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]";
    }

    if (!isSidebarOpen && isChatOpen) {
      return "lg:grid-cols-[minmax(0,1fr)] xl:[grid-template-columns:minmax(0,1fr)_var(--chat-width)]";
    }

    return "lg:grid-cols-[minmax(0,1fr)]";
  }, [chatWidth, isChatOpen, isSidebarOpen, rightRail]);

  return (
    <div
      className={["grid grid-cols-1 gap-0", gridClassName].join(" ")}
      style={{ "--chat-width": `${chatWidth}px` } as React.CSSProperties}
    >
      {isSidebarOpen ? <div className="hidden lg:block">{sidebar}</div> : null}

      <div className="min-w-0">{children}</div>

      {rightRail && isChatOpen ? (
        <div className="relative hidden xl:block">
          <div
            role="separator"
            aria-orientation="vertical"
            className="absolute left-0 top-0 z-20 h-full w-3 cursor-col-resize"
            onMouseDown={(event) => {
              event.preventDefault();
              const startX = event.clientX;
              const startWidth = chatWidth;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = startX - moveEvent.clientX;
                setChatWidth(startWidth + delta);
              };

              const handleMouseUp = () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
              };

              window.addEventListener("mousemove", handleMouseMove);
              window.addEventListener("mouseup", handleMouseUp);
            }}
          />
          {rightRail}
        </div>
      ) : null}
    </div>
  );
}

export default SidebarLayout;
