import { useEffect, useRef, useState } from "react";
import { useQQNotifications } from "../../features/messages/qq-notifications/QQNotifications";
import { useWeChatReminders } from "../../features/messages/wechat/WeChatReminders";
import { useMail } from "../../features/messages/mail/MailPanel";
import { usePluginPreview, usePluginNotifications } from "../../features/messages/pluginNotifications";
import { useOfficeIm } from "../../features/messages/office-im/useOfficeIm";
import { latestMessagePreview, type MessagePreview } from "../../features/messages/messagePreview";
import type { QQNotificationsController } from "../../features/messages/qq-notifications/QQNotifications";
import type { WeChatRemindersController } from "../../features/messages/wechat/WeChatReminders";
import type { MailController } from "../../features/messages/mail/MailPanel";
import type { IslandSettings } from "../../features/appearance/types";
import type { IslandMode } from "./types";
import { canPreviewNotice, previewSecondsFor } from "./noticeRules";
import { useNoticeQueue } from "./useNoticeQueue";
import { noticeSourceValidity } from "./noticeSourceValidity";
import type { QueuedNotice } from "./noticeQueue";
import { useDeviceNotice } from "../../features/device-notices/useDeviceNotice";
import { useDeviceNoticeSettings } from "../../features/device-notices/storage";
import { useIslandWirelessNotices } from "./useIslandWirelessNotices";

/** What can pop up on the collapsed island: message previews (QQ, WeChat, mail). */
export function useIslandNotices(settings: IslandSettings, { mode, isTucked, quiet, critical = false }: { mode: IslandMode; isTucked: boolean; quiet: boolean; critical?: boolean }) {
  // A tucked island still takes message previews when it will slide out to show them. Game mode
  // holds them back unless asked to show them anyway (gameShowNotices), then without taking clicks.
  const canPreviewMessages = canPreviewNotice(settings, quiet, mode, isTucked);
  const previewSeconds = previewSecondsFor(settings, quiet);
  const validity = useRef<(entry: QueuedNotice) => boolean>(() => true);
  const queue = useNoticeQueue({ enabled: mode === "collapsed" && !critical && (!quiet || settings.gameShowNotices),
    boundary: `${mode}:${quiet}:${critical}:${isTucked && !settings.revealOnMessage}`,
    holdEnabled: !quiet, durationMs: previewSeconds * 1000,
    pluginDurationMs: settings.messageAutoExpand || quiet ? previewSeconds * 1000 : 8000,
    isValid: entry => validity.current(entry) });
  const shown = queue.active?.payload;
  const message = shown?.kind === "message" ? shown.preview : null;
  const qqNotifications = useQQNotifications(canPreviewMessages, previewSeconds, queue.acceptMessage);
  const wechatReminders = useWeChatReminders(canPreviewMessages, { previewSeconds, onNotice: queue.acceptMessage });
  const qqMail = useMail(canPreviewMessages, { previewSeconds, autoCopyOtp: settings.autoCopyOtp,
    previewBody: settings.messageAutoExpand, onNotice: queue.acceptMessage,
    managedPreview: message?.source === "qqMail" && message.messageId && message.mailAccount
      ? { account: message.mailAccount, id: message.messageId } : null });
  usePluginPreview(canPreviewMessages, settings.messageAutoExpand || quiet ? previewSeconds : undefined, queue.acceptMessage);
  const plugins = usePluginNotifications();
  const office = useOfficeIm(canPreviewMessages, previewSeconds, queue.acceptMessage);
  const devices = useDeviceNoticeSettings();
  const wireless = useIslandWirelessNotices(mode === "collapsed" && !isTucked && !quiet && !critical, queue.acceptWireless);
  validity.current = noticeSourceValidity({ qq: qqNotifications, wechat: wechatReminders, mail: qqMail,
    plugins, office: office.snapshot, devices, wireless: { enabled: wireless.enabled, ids: wireless.devices.map(device => device.id) } });
  const deviceChange = useDeviceNotice(mode !== "collapsed" || quiet || critical || Boolean(message));
  const { acceptDevice } = queue;
  useEffect(() => { if (deviceChange) acceptDevice(deviceChange); }, [deviceChange, acceptDevice]);
  const preview = message?.source === "qqMail" ? { ...message, detail: qqMail.previewContent,
    detailLoading: qqMail.previewContentLoading, detailError: qqMail.previewContentError } : message;
  return { qqNotifications, wechatReminders, qqMail, preview, hasMessagePreview: Boolean(preview),
    wirelessDevices: wireless.devices,
    wirelessChange: shown?.kind === "wireless" ? shown.device : null,
    deviceChange: shown?.kind === "device" ? shown.notice : null };
}

/**
 * The newest preview of the sources, for the collapsed island; one that arrived earlier never takes
 * the place of a newer one, even when the newer one has already gone.
 */
export function useLatestPreview(
  qqNotifications: QQNotificationsController,
  wechatReminders: WeChatRemindersController,
  pluginPreview: MessagePreview | null,
  qqMail: MailController,
  officePreview: MessagePreview | null = null,
): MessagePreview | null {
  const [latestPreviewAt, setLatestPreviewAt] = useState(0);
  const qqPreview = qqNotifications.preview;
  const preview = latestMessagePreview([
    qqPreview ? { ...qqPreview, source: "qq", receivedAt: qqNotifications.previewReceivedAt ?? 0 } : null,
    wechatReminders.preview,
    pluginPreview,
    officePreview,
    qqMail.preview ? { source: "qqMail", title: qqMail.preview.sender, body: qqMail.preview.subject, detail: qqMail.previewContent,
      detailLoading: qqMail.previewContentLoading, detailError: qqMail.previewContentError,
      otpCode: qqMail.preview.otpCode, mailAccount: qqMail.previewAccount, receivedAt: qqMail.previewReceivedAt ?? 0 } : null,
  ], latestPreviewAt);
  if (preview && preview.receivedAt > latestPreviewAt) setLatestPreviewAt(preview.receivedAt);
  return preview;
}
