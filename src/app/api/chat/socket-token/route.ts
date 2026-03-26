import { getDbUserId } from "@/actions/user.action";
import { createChatSocketToken } from "@/lib/chat-ws-state";

export async function POST() {
  const userId = await getDbUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ token: createChatSocketToken(userId) });
}
