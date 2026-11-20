import { useLocale, useTranslation } from '../../i18n';
import { mailSourceLabel } from './mail/mailProvider';
import { MessageSourceIcon } from './MessageSourceIcon';
import type { MessageSource } from './messagePreview';
import type { MessageRailItem } from './messageRailItems';
import './MessageRail.css';
import type { ReactNode } from 'react';

export function MessageRail({ items, expanded, onOpen, mailAccount, surface }: {
  items: readonly MessageRailItem[];
  expanded: boolean;
  mailAccount?: string | null;
  surface?: ReactNode;
  onOpen: (source: MessageSource) => void;
}) {
  const t = useTranslation();
  const { locale } = useLocale();
  if (!items.length) return null;
  return <div className={`message-rail message-rail--${expanded ? 'expanded' : 'collapsed'}`}>
    {expanded && surface}
    {items.map(({ source, pending }) => <button key={source} type="button"
      className="message-rail__button" data-source={source} aria-label={source === 'qqMail' ? mailSourceLabel(mailAccount, locale) : t.messages.sourceLabels[source]}
      onClick={event => { event.stopPropagation(); onOpen(source); }}>
      <MessageSourceIcon source={source} mailAccount={mailAccount} size={18} />
      {pending && <span className="message-rail__dot" aria-hidden="true" />}
    </button>)}
  </div>;
}
