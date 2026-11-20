import type { QueuedNotice } from "./noticeQueue";
import type { QQNotificationsController } from "../../features/messages/qq-notifications/useQQNotifications";
import type { WeChatRemindersController } from "../../features/messages/wechat/useWeChatReminders";
import type { MailController } from "../../features/messages/mail/useMail";
import type { OwnedNotification } from "../../features/messages/pluginNotifications";
import type { OfficeImSnapshot } from "../../features/messages/office-im/api";
import type { DeviceNoticeSettings } from "../../features/device-notices/model";
import { isOfficeSource } from "../../features/messages/messagePreview";

/** Source lifetimes are independent of their legacy short preview windows. */
export function noticeSourceValidity({ qq, wechat, mail, plugins, office, devices }: {
  qq: QQNotificationsController;
  wechat: WeChatRemindersController;
  mail: MailController;
  plugins: OwnedNotification[];
  office: OfficeImSnapshot;
  devices: DeviceNoticeSettings;
}) {
  return (entry: QueuedNotice) => {
    if (entry.payload.kind === "device") return devices[entry.payload.notice.kind];
    const preview = entry.payload.preview;
    if (preview.source === "qq") return qq.snapshot.enabled && qq.hasPending
      && qq.snapshot.items.some(item => item.id === preview.messageId);
    if (preview.source === "wechat") return wechat.snapshot.enabled && wechat.snapshot.pending
      && (!preview.wechatMessageId || wechat.snapshot.messages.some(item => item.id === preview.wechatMessageId));
    if (preview.source === "qqMail") return mail.mailboxes.some(box => box.email === preview.mailAccount && box.enabled
      && box.items.some(item => item.id === preview.messageId && item.unread));
    if (preview.source === "plugin") return plugins.some(item => item.pluginId === preview.pluginId && item.id === preview.messageId);
    return isOfficeSource(preview.source) && office[preview.source].enabled && office[preview.source].pending;
  };
}
