"use client";

import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Button } from "@/components/ui/button";
import { MessageCircleMoreIcon } from "lucide-react";

type StartChatButtonProps = {
  contact: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

function StartChatButton({
  contact,
  size = "outline" as any,
  className = "",
}: StartChatButtonProps) {
  const { openChat } = useLayoutChrome();

  const handleClick = () => {
    openChat();
    window.dispatchEvent(
      new CustomEvent("social:open-chat", {
        detail: contact,
      })
    );
  };

  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : size === "icon" ? "icon" : "default";

  return (
    <Button
      variant="outline"
      size={buttonSize}
      onClick={handleClick}
      className={className}
    >
      <MessageCircleMoreIcon className={buttonSize === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
      <span>Chat</span>
    </Button>
  );
}

export default StartChatButton;
