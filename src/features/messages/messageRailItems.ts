import type { MessageSource } from './messagePreview';

export type MessageRailItem = { source: MessageSource; pending: boolean };
const SOURCE_ORDER: readonly MessageSource[] = ['wechat', 'qq', 'qqMail', 'dingtalk', 'feishu', 'wecom', 'plugin'];

export function getMessageRailItems(
  enabled: Partial<Record<MessageSource, boolean>>,
  visible: Partial<Record<MessageSource, boolean>>,
  pending: Partial<Record<MessageSource, boolean>>,
): MessageRailItem[] {
  return SOURCE_ORDER.filter(source => enabled[source] && visible[source] !== false && pending[source])
    .map(source => ({ source, pending: Boolean(pending[source]) }));
}
