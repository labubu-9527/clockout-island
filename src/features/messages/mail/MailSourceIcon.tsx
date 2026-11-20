import { Mail } from "lucide-react";
import qqMailIcon from "../../../assets/brands/qq-mail.png";
import { mailProvider } from "./mailProvider";

export function MailSourceIcon({ account, size = 16 }: { account?: string | null; size?: number }) {
  const provider = mailProvider(account);
  if (provider === "qq") return <img className="message-brand-icon message-brand-icon--qqMail" src={qqMailIcon} alt="" aria-hidden="true" width={size} height={size} draggable={false} />;
  if (provider === "netease") return <span className="message-mail-provider-icon" data-mail-provider={provider} style={{ width: size, height: size }} aria-hidden="true">
    <Mail size={size} /><span>{account?.trim().split("@")[1]?.split(".")[0]}</span>
  </span>;
  return <Mail className="message-brand-icon" data-mail-provider={provider} size={size} aria-hidden="true" />;
}
