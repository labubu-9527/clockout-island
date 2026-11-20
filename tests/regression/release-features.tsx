import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { PLUGINS_ENABLED, MAIL_OTP_ENABLED, PLUGIN_MARKET_ENABLED } from "../../src/features/releaseFlags.ts";
import { NATIVE_PLUGINS_KEY, useNativePlugins } from "../../src/features/plugins/native";
import { usePlugins, refreshPlugins } from "../../src/features/plugins/usePlugins";
import { useEffortLabels } from "../../src/features/agent-status/useEffortLabels";
import { useMailOtp } from "../../src/features/messages/mail/useMailOtp";
import type { MailEvent } from "../../src/features/messages/mail/api";
import "../../src/styles/tokens.css";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const calls: string[] = [];
const errors: string[] = [];
mockIPC((command) => { calls.push(command); return null; }, { shouldMockEvents: true });
let otp: ReturnType<typeof useMailOtp>;
let nativeInstalled: ReturnType<typeof useNativePlugins> | null = null;
function Probe({ autoCopy = true }: { autoCopy?: boolean }) {
  const plugins = usePlugins();
  nativeInstalled = useNativePlugins();
  const labels = useEffortLabels();
  otp = useMailOtp(autoCopy, (message) => errors.push(message));
  return <output>{JSON.stringify({ plugins, labels })}</output>;
}
const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const root = createRoot(document.getElementById("fixture")!);
try {
  check(!PLUGINS_ENABLED && MAIL_OTP_ENABLED && !PLUGIN_MARKET_ENABLED, "启用邮箱验证码，插件与插件市场保持关闭");
  // A beta's installs stay saved but count for nothing in a stable build.
  localStorage.setItem(NATIVE_PLUGINS_KEY, JSON.stringify(["dingtalk", "zcode"]));
  await act(async () => root.render(<StrictMode><I18nProvider><Probe /></I18nProvider></StrictMode>));
  await act(async () => { await refreshPlugins(); });
  check(calls.length === 0, "岛上挂载插件消费者不会请求宿主、索引或订阅事件");
  check(nativeInstalled !== null && Object.values(nativeInstalled).every((installed) => !installed), "测试版装过的内置插件在正式版里都算未安装");
  check(document.querySelector("output")?.textContent?.includes('"installed":{}'), "插件快照为空，不产生会话、额度和消息入口");
  const event: MailEvent = {
    snapshot: { email: "test@example.com", configured: true, enabled: true, syncing: false,
      revision: 1, status: "connected", unreadCount: 1, lastSyncedAt: Date.now(), error: null,
      items: [{ id: "7:2", uid: 2, sender: "security@example.com", subject: "Verification code",
        receivedAt: Date.now(), unread: true, otpCode: "834921" }] },
    newestId: "7:2", otpMessageId: "7:2", windowVisible: true,
  };
  await act(async () => {
    otp!.copyArrival(event);
  });
  check(calls.filter((command) => command === "copy_mail_otp").length === 1 && otp!.copiedOtp === "834921",
    "自动复制开关启用时，新到未读验证码复制一次并反馈成功");
  await act(async () => otp!.copyArrival(event));
  check(calls.filter((command) => command === "copy_mail_otp").length === 1, "重复到信事件不重复自动复制");
  await act(async () => root.render(<StrictMode><I18nProvider><Probe autoCopy={false} /></I18nProvider></StrictMode>));
  const nextEvent: MailEvent = { ...event, newestId: "7:3", otpMessageId: "7:3",
    snapshot: { ...event.snapshot, items: [{ ...event.snapshot.items[0], id: "7:3", uid: 3, otpCode: "912345" }] } };
  await act(async () => otp!.copyArrival(nextEvent));
  check(calls.filter((command) => command === "copy_mail_otp").length === 1, "关闭自动复制后到信不改写剪贴板");
  await act(async () => {
    check(await otp!.copyOtp("912345"), "关闭自动复制仍允许手动复制");
  });
  check(calls.filter((command) => command === "copy_mail_otp").length === 2 && errors.every((error) => !error)
    && otp!.copiedOtp === "912345", "手动复制成功且不产生错误");
  await act(async () => root.unmount());
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  messages.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = messages.join("\n");
