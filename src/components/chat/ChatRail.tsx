import { getChatState } from "@/actions/chat.action";
import ChatPanel from "@/components/chat/ChatPanel";

async function ChatRail() {
  const chatState = await getChatState();

  return <ChatPanel initialState={chatState} />;
}

export default ChatRail;
