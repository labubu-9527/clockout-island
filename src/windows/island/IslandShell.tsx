import { MessageRail } from "../../features/messages/MessageRail";
import { IslandGlassLayers } from "./IslandGlassLayers";
import type { MessageRailItem } from "../../features/messages/messageRailItems";
import { isGlass } from "../../features/appearance/settings";
import type { CSSProperties, ReactNode } from "react";
import { useArtworkPalette } from "../../features/media/useArtworkPalette";
import { referenceMusicSurface } from "../../features/media/referenceMusicSurface";
import type { AgentSession } from "../../features/agent-status/session";
import type { QuotaAlert } from "../../features/agent-status/quotaAlerts";
import type { AgentVisualState } from "../../features/agent-status/status";
import type { CollapsedItem, CollapsedSlot, IslandShape, Material, PageButtonStyle, PageDot, TuckStyle } from "../../features/appearance/types";
import type { MediaState } from "../../features/media/api";
import type { SystemStatus } from "../../features/system-status/api";
import type { MessagePreview, MessageSource } from "../../features/messages/messagePreview";
import type { MailController } from "../../features/messages/mail/MailPanel";
import type { QQNotificationsController } from "../../features/messages/qq-notifications/QQNotifications";
import type { WeChatRemindersController } from "../../features/messages/wechat/WeChatReminders";
import { useTranslation } from "../../i18n";
import type { IslandFeatures } from "./features";
import { IslandCollapsedBar } from "./IslandCollapsedBar";
import { IslandHeader } from "./IslandHeader";
import type { IslandMode, IslandPage, NativeGlassState } from "./types";
import { useGlassPointer } from "./useGlassPointer";
import { useIslandPreparing } from "./useIslandPreparing";
import { useMotionLayer } from "./useMotionLayer";
import { usePageFadeIn } from "./usePageFadeIn";
import type { LyricsSettings } from "../../features/media/lyrics/useLyrics";
import type { TodoTimer } from "../../features/todos/timer";
import type { TodoRotationDisplay } from "./CollapsedTodoContent";
import type { NoticeSize } from "./noticeLayout";
import "./IslandShell.css";
import "./IslandPageText.css";
import "./IslandGlass.css";
import "./IslandTuckStyle.css";
import { useTuckMorph } from "./useTuckMorph";
import { usePendingOfficeSource } from "../../features/messages/office-im/useOfficeIm";
import { DEFAULT_ISLAND_EFFECTS, type IslandEffectsSettings } from "../../features/appearance/islandEffects";
import { IslandGlow } from "./IslandGlow";
import { islandMotionStyle } from "./islandMotionStyle";
import "./MusicCapsule.css";
import "./MusicSurface.css";

type IslandShellProps = {
  onMusicGeometry?: (geometry: { width: number; height: number }) => void;
  effects?: IslandEffectsSettings;
  glowTimerRunning?: boolean;
  deviceNotice?: ReactNode;
  slotVisibility?: Partial<Record<CollapsedSlot, boolean>>;
  messageItems?: readonly MessageRailItem[];
  qqMail: MailController;
  qqNotifications: QQNotificationsController;
  wechatReminders: WeChatRemindersController;
  onOpenMessages: (source: MessageSource) => void;
  /** The newest message preview to show on the collapsed island (useIslandNotices), or null. */
  preview: MessagePreview | null;
  /** The size the adaptive preview grew the island to (useMessageNotice), or null. */
  notice: NoticeSize | null;
  mode: IslandMode;
  page: IslandPage;
  /** The open page's height (unscaled); a change resizes the shape around the panel. */
  expandedHeight: number;
  material: Material;
  nativeGlassState: NativeGlassState;
  isTucked: boolean;
  /** How the island looks while tucked: its own rim (edge), a short line, or nothing. */
  tuckStyle: TuckStyle;
  topEdgeShoulders: boolean;
  positionLocked: boolean;
  onSwipeHide?: () => void;
  /** Moved away from its default place by a drag or the margin; a capsule floats without that. */
  isDetached: boolean;
  islandShape?: IslandShape;
  showTitle: boolean;
  showCollapsedText: boolean;
  collapsedTaskTitle: string | null;
  todoTimer?: TodoTimer | null;
  todoRotation?: TodoRotationDisplay | null;
  collapsedTodoCount: number | null;
  /** Which of the agent, the lyric line and a todo the collapsed island's text shows, if any. */
  collapsedItem: CollapsedItem | null;
  collapsedLayout: readonly CollapsedSlot[];
  /** The playing song's cover for the collapsed island, or null when it is not shown. */
  collapsedCover: string | null;
  /** Where the collapsed island's lyric line comes from. */
  lyricsSettings: LyricsSettings & { lyricsOffsetMs: number };
  /** Order of the header's page dots, and saving a new one after a drag. */
  pageOrder: PageDot[];
  pageButtonStyle: PageButtonStyle;
  onPageOrderChange: (order: PageDot[]) => void;
  /** Running agent session shown in place of the todo, or null. */
  agentSession: AgentSession | null;
  /** Agent sessions still working, shown in place of the tuck dot while the AI Agent switch is on. */
  activeAgentSessionCount: number;
  mediaState: MediaState;
  agentVisualState: AgentVisualState;
  agentStatusLabel: string;
  /** Modules switched on; the header and collapsed bar hide the rest. */
  features: IslandFeatures;
  /** Files on the shelf for the collapsed bar, or null when it does not show them. */
  shelfCount: number | null;
  /** CPU and memory usage for the collapsed bar's status slot. */
  systemStatus: SystemStatus;
  cpuEnabled?: boolean;
  memoryEnabled?: boolean;
  weatherBadge?: ReactNode;
  wirelessBadge?: ReactNode;
  clockIndicator?: ReactNode;
  petIndicator?: ReactNode;
  /** Hide the badge on a fixed narrow island so a long todo and its countdown still fit. */
  compactCollapsed: boolean;
  /** Claude's or Codex's usage reaching the alert level, or resetting. */
  quotaAlert?: QuotaAlert | null;
  onOpenPage: (page: IslandPage) => void;
  onWindowDragStart: () => void;
  onCollapse: () => void;
  onResetPosition: () => void;
  minimizesToTray: boolean;
  onMinimize: () => void;
  /** Null while translation is switched off, which hides its button. */
  onOpenTranslator: (() => void) | null;
  /** One line from the selection shortcut, shown on the collapsed island, or null. */
  onOpenSettings: () => void;
  onTuck: () => void;
  onReveal: () => void;
  onPageChange: (page: IslandPage) => void;
  /** Buttons of the open page, first among the window actions. */
  pageActions?: ReactNode;
  children: ReactNode;
};

export function IslandShell({
  onMusicGeometry,
  effects = DEFAULT_ISLAND_EFFECTS,
  glowTimerRunning,
  deviceNotice,
  slotVisibility,
  messageItems = [],
  qqMail,
  qqNotifications,
  wechatReminders,
  onOpenMessages,
  preview,
  notice,
  mode,
  page,
  expandedHeight,
  material,
  nativeGlassState,
  isTucked,
  tuckStyle,
  topEdgeShoulders,
  positionLocked,
  onSwipeHide,
  isDetached,
  islandShape = "notch",
  showTitle,
  showCollapsedText,
  collapsedTaskTitle,
  todoTimer = null,
  todoRotation = null,
  collapsedTodoCount,
  collapsedItem,
  collapsedLayout,
  collapsedCover,
  lyricsSettings,
  pageOrder,
  pageButtonStyle,
  onPageOrderChange,
  agentSession,
  activeAgentSessionCount,
  mediaState,
  agentVisualState,
  agentStatusLabel,
  features,
  shelfCount,
  systemStatus,
  cpuEnabled = true,
  memoryEnabled = true,
  weatherBadge,
  wirelessBadge,
  clockIndicator,
  petIndicator,
  compactCollapsed,
  quotaAlert = null,
  onOpenPage,
  onWindowDragStart,
  onCollapse,
  onResetPosition,
  minimizesToTray,
  onMinimize,
  onOpenTranslator,
  onOpenSettings,
  onTuck,
  onReveal,
  onPageChange,
  pageActions,
  children,
}: IslandShellProps) {
  const t = useTranslation();
  const isExpanded = mode === "expanded";
  const railMailAccount = qqMail.mailboxes?.find(mailbox => mailbox.enabled && (mailbox.unreadCount ?? 0) > 0)?.email ?? qqMail.snapshot.email;
  const openRailSource = (source: MessageSource) => {
    const launching = source === "qq" ? qqNotifications.openQQ()
      : source === "wechat" ? wechatReminders.openWeChat() : null;
    if (launching) {
      void launching.then(opened => { if (opened === false) onOpenMessages(source); });
    } else {
      onOpenMessages(source);
    }
  };
  const glass = isGlass(material);
  const musicCapsule = features.music && mediaState.playbackStatus === "playing" && Boolean(mediaState.title) && !preview && !quotaAlert && !deviceNotice;
  const palette = useArtworkPalette(mediaState.thumbnail);
  const musicSurface = referenceMusicSurface(material, isExpanded, palette.background);
  const isLiquidGlass = material === "liquidGlass";
  const { handleGlassPointerMove, resetGlassPointer } = useGlassPointer(isLiquidGlass);
  const isPreparing = useIslandPreparing(isExpanded);
  const tuckMorphClass = useTuckMorph(isTucked, tuckStyle);
  const contentRef = usePageFadeIn<HTMLDivElement>(page, mode);
  const panelRef = useMotionLayer<HTMLDivElement>(mode, page, expandedHeight, isExpanded ? effects.motionDuration : effects.motionCollapseDuration);
  const qqNotificationCount = qqNotifications.snapshot.items.length;
  const wechatPending = wechatReminders.snapshot.pending;
  const officePending = usePendingOfficeSource();
  const className = [
    "island",
    musicCapsule ? "island--music-capsule" : "",
    ((!isExpanded && musicCapsule) || (isExpanded && page === "music" && mediaState.title)) ? "island--music-surface" : "",
    `island--${mode}`,
    `island--shape-${islandShape}`,
    `island--${page}`,
    `island--material-${material}`,
    isPreparing && !isExpanded ? "island--preparing" : "",
    isDetached || islandShape === "pill" ? "island--detached" : "island--docked",
    islandShape === "pill" ? "island--capsule" : "",
    isTucked ? "island--tucked" : "",
    tuckMorphClass,
    topEdgeShoulders && islandShape !== "pill" ? "island--shoulders" : "",
    glass ? `island--glass-${nativeGlassState}` : "",
    showTitle ? "" : "island--title-hidden",
    notice && !isExpanded ? "island--notice" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const collapsedLabel = showCollapsedText
    ? todoTimer
      ? t.todo.actionOnTask(todoTimer.notified ? t.todo.timeUp : t.todo.countdown, collapsedTaskTitle ?? "")
      : agentSession
      ? t.island.agentSession(agentSession.label, agentSession.title)
      : collapsedTaskTitle
      ? t.messages.collapsedTask(collapsedTaskTitle)
      : collapsedTodoCount !== null
        ? t.island.pendingTodos(collapsedTodoCount)
        : t.island.appName
    : t.island.appName;

  return (
    <section
      className={className}
      style={{ ...islandMotionStyle(effects, isExpanded), "--capsule-text": palette.text,
        "--capsule-secondary": palette.secondary, "--capsule-accent": palette.primary,
        "--music-surface-top": musicSurface.top, "--music-surface-bottom": musicSurface.bottom,
        "--music-surface-alpha": musicSurface.alpha, "--music-surface-frost": musicSurface.frost,
        "--music-surface-reflection": musicSurface.reflection } as CSSProperties}
      aria-label={collapsedLabel}
      onClick={(event) => {
        if (!isExpanded && event.target === event.currentTarget) {
          onOpenPage(page);
        }
      }}
      onPointerMove={handleGlassPointerMove}
      onPointerLeave={resetGlassPointer}
      onMouseEnter={() => {
        if (isTucked) {
          onReveal();
        }
      }}
    >
      <span className="island__shoulders" aria-hidden="true" />
      <IslandGlow settings={effects} music={features.music && (mediaState.playbackStatus === "playing" || mediaState.playbackStatus === "unavailable" && mediaState.audioActive)}
        timer={glowTimerRunning ?? Boolean(todoTimer && !todoTimer.notified)} hidden={isTucked} artwork={mediaState.thumbnail} />
      {glass && <span className="island__glass-shadow" aria-hidden="true" />}
      <div className="island__surface">
        {/* Outside .island__glass, whose top fades out when attached (IslandTopEdge.css). */}
        {glass && <IslandGlassLayers liquid={isLiquidGlass} />}
        <IslandCollapsedBar
          onMusicGeometry={onMusicGeometry}
          deviceNotice={deviceNotice}
          qqMail={qqMail}
          qqNotifications={qqNotifications}
          wechatReminders={wechatReminders}
          preview={preview}
          noticeReader={notice?.reader ? { scrolls: notice.scrolls } : null}
          page={page}
          isExpanded={isExpanded}
          isTucked={isTucked}
          positionLocked={positionLocked}
          onSwipeHide={onSwipeHide}
          showTitle={showTitle}
          showCollapsedText={showCollapsedText}
          collapsedLabel={collapsedLabel}
          collapsedTaskTitle={collapsedTaskTitle}
          todoTimer={todoTimer}
          todoRotation={todoRotation}
          collapsedTodoCount={collapsedTodoCount}
          collapsedItem={collapsedItem}
          collapsedLayout={collapsedLayout}
          slotVisibility={slotVisibility}
          messageRail={!isExpanded && !isTucked && <MessageRail items={messageItems} mailAccount={railMailAccount} expanded={false} onOpen={openRailSource} />}
          collapsedCover={collapsedCover}
          lyricsSettings={lyricsSettings}
          agentSession={agentSession}
          agentSessionCount={features.agents ? activeAgentSessionCount : null}
          mediaState={mediaState}
          showMusic={features.music}
          shelfCount={shelfCount}
          systemStatus={systemStatus}
          cpuEnabled={cpuEnabled}
          memoryEnabled={memoryEnabled}
          weatherBadge={weatherBadge}
          wirelessBadge={wirelessBadge}
          clockIndicator={clockIndicator}
          petIndicator={petIndicator}
          compactCollapsed={compactCollapsed}
          quotaAlert={quotaAlert}
          agentVisualState={agentVisualState}
          onOpenPage={onOpenPage}
          onOpenMessages={onOpenMessages}
          onWindowDragStart={onWindowDragStart}
          onTuck={onTuck}
        />

        <div
          ref={panelRef}
          id="island-panel"
          className="island__expanded"
          aria-hidden={!isExpanded}
          inert={!isExpanded}
        >
          <IslandHeader
            separateMessageRail
            isExpanded={isExpanded && !isTucked}
            page={page}
            features={features}
            pageOrder={pageOrder}
            pageButtonStyle={pageButtonStyle}
            onPageOrderChange={onPageOrderChange}
            showTitle={showTitle}
            isDetached={isDetached}
            agentVisualState={agentVisualState}
            agentStatusLabel={agentStatusLabel}
            qqNotificationCount={qqNotificationCount}
            wechatPending={wechatPending}
            officePending={officePending}
            onPageChange={onPageChange}
            onCollapse={onCollapse}
            onOpenSettings={onOpenSettings}
            onOpenMessages={onOpenMessages}
            onOpenTranslator={onOpenTranslator}
            onResetPosition={onResetPosition}
            minimizesToTray={minimizesToTray}
            onMinimize={onMinimize}
            pageActions={pageActions}
          />
          <div ref={contentRef} className="island__content">{children}</div>
        </div>
      </div>
      {isExpanded && !isTucked && <MessageRail items={messageItems} mailAccount={railMailAccount} expanded onOpen={openRailSource}
        surface={glass && <IslandGlassLayers liquid={isLiquidGlass} rail />} />}
    </section>
  );
}
