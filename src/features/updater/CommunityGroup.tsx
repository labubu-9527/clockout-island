import { MessageSquare } from "lucide-react";
import { useTranslation } from "../../i18n";
import { PROJECT_ISSUES_URL } from "./projectLinks";
import { ProjectLink } from "./ProjectLink";
import { useCommunityInvite } from "./useCommunityInvite";

/** The retained invite preference now marks the fork's feedback entry as seen. */
export function CommunityGroup() {
  const text = useTranslation().settings.project;
  const { markSeen } = useCommunityInvite();
  return <ProjectLink href={PROJECT_ISSUES_URL} title={text.community} hint={text.communityHint} onOpen={markSeen}
    icon={<MessageSquare className="project-link__icon" size={18} aria-hidden="true" />} />;
}
