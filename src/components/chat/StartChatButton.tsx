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
};

function StartChatButton({ contact }: StartChatButtonProps) {
  const { openChat } = useLayoutChrome();

  const handleClick = () => {
    openChat();
    window.dispatchEvent(
      new CustomEvent("social:open-chat", {
        detail: contact,
      })
    );
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      <MessageCircleMoreIcon className="mr-2 h-4 w-4" />
      Chat
    </Button>
  );
}

export default StartChatButton;
