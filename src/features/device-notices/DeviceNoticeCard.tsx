import { ArrowBigUpDash, Grid3X3, Mic, MicOff, Touchpad, TouchpadOff } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { DeviceNotice } from './model';
import './DeviceNoticeCard.css';

export function DeviceNoticeCard({ notice }: { notice: DeviceNotice }) {
  const text = useTranslation().deviceNotices;
  const Icon = notice.kind === 'capsLock' ? ArrowBigUpDash : notice.kind === 'numLock' ? Grid3X3
    : notice.kind === 'microphoneMuted' ? notice.value ? MicOff : Mic : notice.value ? Touchpad : TouchpadOff;
  const label = notice.kind === 'microphoneMuted' ? notice.value ? text.muted : text.unmuted : notice.value ? text.enabled : text.disabled;
  return <div className="device-notice" role="status" aria-live="polite" aria-atomic="true" data-device-kind={notice.kind}>
    <span className={`device-notice__icon${notice.kind === 'microphoneMuted' && notice.value ? ' device-notice__icon--muted' : ''}`}>
      <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
    </span>
    <span className="device-notice__name">{text.labels[notice.kind]}</span>
    <span className="device-notice__state">{label}</span>
  </div>;
}
