import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider, LOCALE_STORAGE_KEY } from '../../src/i18n';
import { MessageRail } from '../../src/features/messages/MessageRail';
import { getMessageRailItems } from '../../src/features/messages/messageRailItems';
import '../../src/styles/tokens.css';
import '../../src/styles/base.css';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const previousLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN');
window.addEventListener('beforeunload', () => {
  if (previousLocale === null) localStorage.removeItem(LOCALE_STORAGE_KEY);
  else localStorage.setItem(LOCALE_STORAGE_KEY, previousLocale);
});
const root = createRoot(document.getElementById('root')!);
const checks: string[] = [];
const enabled = { qq: true, wechat: true, qqMail: true, plugin: true };
let selected = '';
const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); checks.push(`PASS ${label}`); };
async function render(expanded: boolean, hideQQ = false, mailAccount?: string, unread = true) {
  const items = getMessageRailItems(enabled, { ...enabled, qq: !hideQQ }, unread ? enabled : {});
  await act(async () => root.render(<I18nProvider><div id="body" style={{ position: 'relative', width: 560, height: 300, background: '#111', color: 'white', '--island-expanded-scale': 1.4 } as React.CSSProperties}>
    <MessageRail items={items} expanded={expanded} mailAccount={mailAccount} onOpen={source => { selected = source; }} />
  </div></I18nProvider>));
}
try {
  await render(false);
  check(document.querySelectorAll('.message-rail__button').length === 4, 'all unread enabled sources have independent entries');
  check(document.querySelectorAll('.message-rail__dot').length === 4, 'unread sources have red dots');
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.message-rail__button')];
  check(buttons.every(button => Boolean(button.getAttribute('aria-label'))), 'all message buttons have accessible labels');
  buttons[2].click();
  check(selected === 'qqMail', 'mail entry opens the mail source');
  await render(true);
  const body = document.getElementById('body')!.getBoundingClientRect();
  const rail = document.querySelector('.message-rail')!.getBoundingClientRect();
  check(Math.abs(rail.left - body.right - 11.2) < 1 && Math.abs(rail.width - 50.4) < 1 && Math.abs(rail.height - 190.4) < 1,
    'expanded rail matches scaled native width height and gap');
  check(getComputedStyle(document.querySelector('.message-rail')!).flexDirection === 'column', 'expanded entries form a vertical capsule');
  await render(true, true);
  check(document.querySelectorAll('.message-rail__button').length === 3 && enabled.qq, 'hiding an icon leaves its service enabled');
  for (const email of ['user@163.com', 'user@126.com', 'user@yeah.net']) {
    await render(false, false, email);
    const mail = document.querySelector('[data-source="qqMail"]')!;
    check(Boolean(mail.querySelector('[data-mail-provider="netease"]')) && !mail.querySelector('img'), `${email} shows NetEase instead of QQ branding`);
    check(mail.getAttribute('aria-label') === '网易邮箱', `${email} has a provider-specific accessible label`);
  }
  await render(false, false, 'user@foxmail.com');
  check(Boolean(document.querySelector('[data-source="qqMail"] img')), 'QQ domains retain their existing mail icon');
  await render(false, false, 'user@example.org');
  check(Boolean(document.querySelector('[data-source="qqMail"] [data-mail-provider="generic"]')), 'other mailboxes use a generic mail icon');
  await render(false, false, undefined, false);
  check(!document.querySelector('.message-rail'), 'no unread messages leaves no notification rail or reserved controls');
  document.documentElement.dataset.testResult = 'passed';
} catch (error) {
  checks.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = 'failed';
} finally {
  document.getElementById('results')!.textContent = checks.join('\n');
}
