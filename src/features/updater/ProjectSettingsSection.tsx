import { useSyncExternalStore } from "react";
import { GitFork, Star } from "lucide-react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { useTranslation } from "../../i18n";
import markUrl from "../../../src-tauri/icons/mark.svg";
import { CommunityGroup } from "./CommunityGroup";
import { ProjectLink } from "./ProjectLink";
import { PROJECT_REPO_URL, UPSTREAM_REPO_URL } from "./projectLinks";
import { getUpdateState, subscribeToUpdate } from "./updaterController";
import "./ProjectSettingsSection.css";

/** Settings → About, first: the island's mark, name, version and what it does. */
export function ProjectIdentitySection() {
  const t = useTranslation();
  const { version } = useSyncExternalStore(subscribeToUpdate, getUpdateState);

  return (
    <SettingsGroup>
      <div className="about-identity">
        <img className="about-identity__mark" src={markUrl} alt="" width={48} height={48} />
        <div className="about-identity__body">
          <div className="about-identity__heading">
            <p className="about-identity__name">{t.settings.project.appName}</p>
            {version && <span className="about-identity__version">{t.settings.project.versionChip(version)}</span>}
          </div>
          <p className="about-identity__description">{t.settings.project.description}</p>
        </div>
      </div>
    </SettingsGroup>
  );
}

/** Fork feedback, repository and retained upstream attribution. */
export function ProjectLinksSection() {
  const text = useTranslation().settings.project;

  return (
    <SettingsGroup>
      <CommunityGroup />
      <ProjectLink
        href={PROJECT_REPO_URL}
        tone="star"
        title={text.star}
        hint={text.starHint}
        icon={<Star className="project-link__icon" size={18} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />}
      />
      <ProjectLink href={UPSTREAM_REPO_URL} title={text.upstream} hint={text.upstreamHint}
        icon={<GitFork className="project-link__icon" size={18} aria-hidden="true" />} />
    </SettingsGroup>
  );
}
