export type MailProvider = "qq" | "netease" | "generic";

export function mailProvider(account?: string | null): MailProvider {
  const domain = account?.trim().toLowerCase().split("@");
  if (domain?.length !== 2 || !domain[0]) return "generic";
  if (["qq.com", "vip.qq.com", "foxmail.com"].includes(domain[1])) return "qq";
  if (["163.com", "126.com", "yeah.net"].includes(domain[1])) return "netease";
  return "generic";
}

export function mailSourceLabel(account: string | null | undefined, locale: "zh-CN" | "en"): string {
  const labels = locale === "en"
    ? { qq: "QQ Mail", netease: "NetEase Mail", generic: "Mail" }
    : { qq: "QQ邮箱", netease: "网易邮箱", generic: "邮箱" };
  return labels[mailProvider(account)];
}
