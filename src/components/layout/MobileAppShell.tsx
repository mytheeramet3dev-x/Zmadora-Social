import { getCurrentUserContext } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import BottomNav from "@/components/layout/BottomNav";
import MobilePostFAB from "@/components/feed/MobilePostFAB";
import MobileChatFAB from "@/components/chat/MobileChatFAB";

export default async function MobileAppShell() {
  const context = await getCurrentUserContext();
  
  if (!context) return null;

  const profileHref = context.profileHref;
  const [{ notifications, unreadCount: unreadNotifications }, unreadMessages] = await Promise.all([
    getNotifications(),
    getChatUnreadCount(),
  ]);

  return (
    <>
      <MobilePostFAB userImage={context.dbUser.image} />
      <MobileChatFAB initialUnreadCount={unreadMessages} />
      <BottomNav
        userId={context.dbUser.id}
        profileHref={profileHref} 
        initialNotifications={notifications}
        unreadNotifications={unreadNotifications} 
      />
    </>
  );
}
