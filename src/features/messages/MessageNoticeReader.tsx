import type { PointerEventHandler } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslation } from "../../i18n";
import { mailSourceLabel } from "./mail/mailProvider";
import { MessageSourceIcon } from "./MessageSourceIcon";
import { noticeText, type MessagePreview } from "./messagePreview";
import { MailOtpCode } from "./mail/MailOtpCode";
import "./MessageNoticeReader.css";

type DragHandlers = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

/**
 * The adaptive message preview on the collapsed island: the sender with an open button, then the
 * whole text, wrapped and scrolling past the island's limit. Only the source icon moves the window;
 * the sender and the text are for reading, selecting and Ctrl+C (#83), so pressing in them neither
 * drags nor opens. `scrolls` adds the fade that says there is more below.
 */
export function MessageNoticeReader({ preview, scrolls, drag, onOpen, onRetry, onCopyOtp, copiedOtp }: {
  preview: MessagePreview;
  scrolls: boolean;
  drag: DragHandlers;
  onOpen: () => void;
  onRetry?: () => void;
  onCopyOtp?: (code: string) => Promise<boolean>;
  copiedOtp?: string | null;
}) {
  const t = useTranslation();
  const { locale } = useLocale();
  const { sender, body } = noticeText(preview, t.messages);
  const source = preview.source === "qqMail" ? mailSourceLabel(preview.mailAccount, locale) : t.messages.sourceLabels[preview.source];
  return (
    <div className="message-notice" role="status" aria-live="polite" aria-label={t.messages.noticeReader(sender)}>
      <div className="message-notice__header">
        <span className="message-notice__drag" {...drag}><MessageSourceIcon source={preview.source} mailAccount={preview.mailAccount} size={16} /></span>
        <strong className="message-notice__sender">{sender}</strong>
        {preview.source === "qqMail" && preview.otpCode && onCopyOtp && <MailOtpCode
          code={preview.otpCode} copied={copiedOtp === preview.otpCode} onCopy={onCopyOtp} />}
        <button className="message-notice__open" type="button" aria-label={t.messages.noticeOpen(source)} title={t.messages.noticeOpen(source)}
          onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
          <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      <div className={`message-notice__body${scrolls ? " message-notice__body--scrolls" : ""}`} data-window-drag="false" tabIndex={0}>
        {body}
        {preview.detailLoading && <p className="message-notice__status">{t.mail.loading}</p>}
        {preview.detailError && <p className="message-notice__status" role="alert">{preview.detailError} <button className="message-action" type="button" onClick={onRetry}>{t.common.retry}</button></p>}
      </div>
    </div>
  );
}
