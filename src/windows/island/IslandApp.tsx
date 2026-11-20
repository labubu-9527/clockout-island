import { useOfficeImSnapshot } from "../../features/messages/office-im/useOfficeIm";
import { getMessageRailItems } from "../../features/messages/messageRailItems";
import { usePluginNotifications } from "../../features/messages/pluginNotifications";
import { useWeather } from "../../features/weather/useWeather";
import { WeatherBadge } from "../../features/weather/WeatherBadge";
import { ClockIndicator } from "../../features/clock";
import { IslandPet, resolvePetState } from "../../features/island-pet";
import { useMemo } from "react";
// First: the message panels it loads bring CSS that must come before the page panels' and the shell's.
import { useIslandNotices } from "./useIslandNotices";
// The page panels; before IslandShell so their CSS keeps its place in the cascade.
import { IslandPages } from "./IslandPages";
import { useTranslation } from "../../i18n";
import { useSettingsPresentation } from "../settings/useSettingsPresentation";
import { useSettingsNavigation } from "./useSettingsNavigation";
import { useIslandSettings } from "../../features/appearance/useIslandSettings";
import { useDocumentTheme } from "../../features/appearance/useDocumentTheme";
import { resolveSchemeColors } from "../../features/appearance/theme";
import { useClipboardHistory } from "../../features/clipboard/useClipboardHistory";
// Imported after the page panels so its CSS keeps its place in the cascade.
import { IslandShell } from "./IslandShell";
import { useMediaState } from "../../features/media/useMediaState";
import { useSystemStatus } from "../../features/system-status/useSystemStatus";
import type { TodoItem } from "../../features/todos/types";
import { useIslandWindow } from "./useIslandWindow";
import { getExpandedIslandHeight } from "./expandedHeight";
import { getIslandStageStyle } from "./stageStyle";
import { useCollapsedTodo } from "./useCollapsedTodo";
import { useMessageNotice } from "./useMessageNotice";
import { useGameMode } from "./useGameMode";
import { useIslandKeyboard } from "./useIslandKeyboard";
import { useCtrlWheelPages, wheelPageOrder } from "./useCtrlWheelPages";
import { useIslandFeatures } from "./useIslandFeatures";
import { useIslandAgentAlerts } from "./useIslandAgentAlerts";
import { useIslandAgents } from "./useIslandAgents";
import { useQuotaAlert } from "../../features/agent-status/useQuotaAlert";
import { AgentArrangeButton } from "../../features/agent-status/AgentArrangeButton";
import { useAgentIndicator } from "./useAgentIndicator";
import { usageLineCount } from "../../features/agent-status/usage";
import { useIslandNavigation } from "./useIslandNavigation";
import { useIslandTodos } from "./useIslandTodos";
import { useIslandTucking } from "./useIslandTucking";
import { useIslandShelf } from "./useIslandShelf";
import { useIslandHover } from "./useIslandHover";
import { useIdleUpdateInstall } from "../../features/updater/useIdleUpdateInstall";
import { useIslandTranslation } from "./useIslandTranslation";
import { useMessageView } from "./useMessageView";
import { useSettingsPageHeight } from "./useSettingsPageHeight";
import { useIslandPickerOpen } from "../../lib/islandPicker";
import { TODO_DATE_PICKER_EXPANDED_ISLAND_HEIGHT, alignCollapsedIslandWidth, getClockPetWidth } from "./layout";
import { collapsedPresentationLayout } from "./collapsedPresentation";
// Must stay the last import: IslandApp.css overrides the feature styles above.
import "./IslandApp.css";

// Stands in for the todo list while todos are switched off, so the collapsed island shows none.
const NO_TODOS: TodoItem[] = [];

/**
 * The island window: puts the feature hooks together and hands their state to the shell and the
 * page panels. Each concern's wiring lives in its own use* hook next to this file; add new wiring
 * there rather than here, so parallel changes do not all meet in this file.
 */
export function IslandApp() {
  const t = useTranslation();
  const navigation = useIslandNavigation();
  const { mode, isTucked, page, setPage, collapseIsland, tuckIsland, revealIsland, minimizeToEdge, openIslandPage, toggleClipboardHistory } = navigation;
  const [settings, setSettings] = useIslandSettings();
  const detachedSettings = useSettingsPresentation();
  const { openSettings, changePresentation } = useSettingsNavigation(openIslandPage, setPage);
  const { settingsContentHeight, reportSettingsHeight } = useSettingsPageHeight();
  // Quiet while a full-screen app (usually a game) is in front, if game mode asks for it.
  const game = useGameMode(settings, { mode, isTucked, collapseIsland, tuckIsland, revealIsland });
  const notices = useIslandNotices(settings, { mode, isTucked, quiet: game.quiet });
  useIdleUpdateInstall(mode === "collapsed", game.quiet);
  const { qqNotifications, wechatReminders, qqMail, preview, hasMessagePreview } = notices;
  // The output level shows only on the collapsed island (its waveform).
  const media = useMediaState(settings.musicEnabled, mode === "collapsed");
  // Only the collapsed bar shows the reading, so only poll while it can be seen.
  const systemStatus = useSystemStatus(mode === "collapsed" && !isTucked && media.mediaState.playbackStatus !== "playing" && (settings.collapsedAutoWidth || settings.collapsedWidth > 280) && (settings.cpuEnabled || settings.memoryEnabled));
  const weather = useWeather();
  const { agentStatus, agentSessions, listedAgentSessions, activeAgentSessionCount, unseenAgentSessions, agentRemoval, agentSession, agentUsages, alertUsages } =
    useIslandAgents(settings);
  const quotaAlert = useQuotaAlert(alertUsages, settings.agentStatusEnabled ? settings.agentQuotaAlertPercent : 0, {
    quiet: game.quiet,
    canPopUp: !game.quiet && mode === "collapsed" && !isTucked,
  });
  const { todos, activeTodoId, activeTodoIds, timer, timers, todoPageMode, todoListHeight, notebookProps } = useIslandTodos({ settings, navigation, quiet: game.quiet });

  const songPlaying = settings.musicEnabled && media.mediaState.playbackStatus === "playing" && Boolean(media.mediaState.title);
  const cover = settings.collapsedShowCover && songPlaying ? media.mediaState.thumbnail : null;
  const { collapsedTaskTitle, collapsedTodoCount, collapsedItem, collapsedIslandWidth, todoRotation, collapsedTimer } =
    useCollapsedTodo(
      settings.todoEnabled ? todos : NO_TODOS,
      settings.todoEnabled ? activeTodoId : null,
      settings.todoEnabled ? settings : { ...settings, showIdleTodoCount: false },
      mode !== "collapsed" || isTucked || !settings.showCollapsedText || hasMessagePreview,
      agentSession ? t.agent.phase[agentSession.phase ?? "running"] : null,
      { lyricsPlaying: songPlaying, coverWanted: Boolean(cover), timer: settings.todoEnabled ? timer : null,
        activeIds: settings.todoEnabled ? activeTodoIds : [], timers: settings.todoEnabled ? timers : [] },
    );
  // The cover goes with the lyric line: when something ranked above lyrics is shown, it goes too.
  const collapsedCover = collapsedItem === "lyrics" ? cover : null;
  const { agentVisualState, agentStatusLabel } = useAgentIndicator(agentStatus, settings, activeAgentSessionCount, t);
  useIslandTucking({
    settings,
    navigation,
    hasMessagePreview,
    activity: { agentVisualState, collapsedItem, songPlaying, activeTodoId, timer },
    gameHolds: game.quiet || game.tuck,
  });

  const { messageSource, setMessageSource, openMessages } = useMessageView(qqMail.closeReader, openIslandPage);

  const clipboard = useClipboardHistory(toggleClipboardHistory);
  const { clipboardHistory } = clipboard;

  const { features, openEnabledPage } = useIslandFeatures({
    settings,
    clipboardEnabled: clipboardHistory.settings.enabled,
    qqEnabled: qqNotifications.snapshot.enabled,
    wechatEnabled: wechatReminders.snapshot.enabled,
    qqMail,
    page,
    messageSource,
    setPage,
    setMessageSource,
    openIslandPage,
  });
  const pluginNotifications = usePluginNotifications();
  const officeSnapshot = useOfficeImSnapshot();
  const messageItems = getMessageRailItems(features, settings.messageSourceVisibility, {
    qq: qqNotifications.hasPending, wechat: wechatReminders.snapshot.pending,
    qqMail: qqMail.unreadTotal > 0, plugin: pluginNotifications.length > 0,
    dingtalk: officeSnapshot.dingtalk.pending, feishu: officeSnapshot.feishu.pending, wecom: officeSnapshot.wecom.pending,
  });
  const { fileShelf, isShelfDropping } = useIslandShelf(settings, navigation);
  const lyricMode = songPlaying && !preview && !quotaAlert;
  const collapsedMessages = lyricMode ? messageItems.filter(item => item.pending) : messageItems;
  const slotVisible = (slot: keyof typeof settings.collapsedSlotVisibility) => settings.collapsedSlotVisibility[slot];
  const presentation = collapsedPresentationLayout({
      textWidth: settings.showCollapsedText && (settings.showTitle || collapsedItem !== null) ? collapsedIslandWidth : 36,
      pet: settings.petEnabled && slotVisible("pet"),
      clockWidth: settings.clockEnabled && slotVisible("clock") ? getClockPetWidth({ ...settings, petEnabled: false }) + 8 : 0,
      statusCount: Number(settings.cpuEnabled && slotVisible("cpu")) + Number(settings.memoryEnabled && slotVisible("memory")),
      weather: weather.settings.enabled && slotVisible("weather"),
      shelf: settings.shelfEnabled && settings.shelfShowCount && fileShelf.items.length > 0 && slotVisible("shelf"),
      music: features.music && slotVisible("music"), agents: (!features.agents || activeAgentSessionCount > 0) && slotVisible("agents"),
      messages: collapsedMessages.length, lyricMode, timer: Boolean(collapsedTimer),
    }, settings.collapsedAutoWidth ? 480 : settings.collapsedWidth);
  const visibleCollapsedWidth = settings.collapsedAutoWidth
    ? alignCollapsedIslandWidth(presentation.width, window.innerWidth, window.devicePixelRatio, 480) : collapsedIslandWidth;
  const notice = useMessageNotice(preview, settings, { mode, isTucked, quiet: game.quiet, collapsedIslandWidth: visibleCollapsedWidth,
    readerSideWidth: (settings.petEnabled && slotVisible("pet") ? 48 : 0) + (collapsedMessages.length ? Math.min(80, collapsedMessages.length * 32) + 8 : 0) });
  const { alertedSession, approvals: agentApprovals, agentCardHeight } = useIslandAgentAlerts({
    sessions: agentSessions,
    unseen: unseenAgentSessions.keys,
    settings,
    enabled: features.agents && !game.quiet,
    mode,
    page,
    openIslandPage,
    collapseIsland,
  });
  const pickerOpen = useIslandPickerOpen();
  const expandedIslandHeight = Math.max(pickerOpen && page === "todo" ? TODO_DATE_PICKER_EXPANDED_ISLAND_HEIGHT : 0, getExpandedIslandHeight({
    page,
    todoPageMode,
    todos,
    todoListHeight,
    hasMediaCommandError: Boolean(media.mediaCommandError),
    messageSource,
    isReadingMail: qqMail.wantsTallPanel,
    maxPanelHeight: settings.maxPanelHeight,
    clipboardVisibleRows: settings.clipboardVisibleRows,
    todoVisibleRows: settings.todoVisibleRows,
    agentVisibleRows: settings.agentVisibleRows,
    agentSessionView: settings.agentSessionView,
    fontScale: settings.islandFontPercent / 100,
    agentUsageLines: settings.agentShowUsage ? usageLineCount(agentUsages) : 0,
    agentAlertRowHeight: agentCardHeight,
    settingsContentHeight,
    shelfItems: fileShelf.items.length,
  }));
  const scheme = useDocumentTheme(settings);
  const colors = useMemo(() => resolveSchemeColors(settings, scheme), [settings, scheme]);
  const stageStyle = useMemo(
    () => getIslandStageStyle(settings, colors, notice.size?.width ?? visibleCollapsedWidth, expandedIslandHeight, notice.size?.height),
    [visibleCollapsedWidth, colors, expandedIslandHeight, settings, notice.size],
  );


  const {
    isPositionDetached,
    nativeGlassState,
    minimizeIsland,
    startIslandDrag,
    resetIslandPosition,
  } = useIslandWindow({
    mode,
    isTucked,
    settings,
    setSettings,
    expandedIslandHeight,
    collapsedIslandWidth: visibleCollapsedWidth,
    messageRailCount: messageItems.length,
    notice: notice.nativeNotice,
    onCollapse: collapseIsland,
  });

  const hoverTucked = useIslandHover({
    settings,
    navigation,
    quiet: game.quiet,
    hasMessagePreview,
    namesAgent: Boolean(agentSession),
    openEnabledPage,
  });

  useIslandKeyboard(
    clipboardHistory.settings.enabled && clipboardHistory.settings.shortcutEnabled,
    clipboardHistory.settings.shortcut,
    toggleClipboardHistory,
    collapseIsland,
  );

  useCtrlWheelPages({
    enabled: settings.ctrlWheelPages,
    mode,
    page,
    pages: wheelPageOrder(settings.pageOrder, features, settings.clipboardDetached),
    onPageChange: setPage,
  });

  const { openTranslator } = useIslandTranslation(
    settings.translationEnabled,
    features.translation,
    mode,
    page,
    openIslandPage,
    collapseIsland,
  );

  return (
    <main className={`stage stage--font-${settings.fontFamily}`} data-tone={colors.tone} style={stageStyle}>
      <IslandShell
        slotVisibility={settings.collapsedSlotVisibility}
        messageItems={messageItems}
        qqMail={qqMail}
        qqNotifications={qqNotifications}
        wechatReminders={wechatReminders}
        onOpenMessages={openMessages}
        preview={preview}
        notice={notice.size}
        mode={mode}
        page={page}
        expandedHeight={expandedIslandHeight}
        material={settings.material}
        nativeGlassState={nativeGlassState}
        isTucked={isTucked}
        tuckStyle={settings.tuckStyle}
        topEdgeShoulders={settings.topEdgeShoulders}
        positionLocked={settings.positionLocked}
        isDetached={isPositionDetached || settings.marginY > 0}
        islandShape={settings.islandShape}
        showTitle={settings.showTitle}
        showCollapsedText={settings.showCollapsedText}
        collapsedTaskTitle={collapsedTaskTitle}
        todoRotation={todoRotation}
        todoTimer={settings.todoEnabled ? collapsedTimer : null}
        collapsedTodoCount={collapsedTodoCount}
        collapsedItem={collapsedItem}
        collapsedLayout={settings.collapsedLayout}
        collapsedCover={collapsedCover}
        lyricsSettings={settings}
        pageOrder={settings.pageOrder}
        pageButtonStyle={settings.pageButtonStyle}
        onPageOrderChange={(pageOrder) => setSettings({ ...settings, pageOrder })}
        agentSession={agentSession}
        activeAgentSessionCount={activeAgentSessionCount}
        mediaState={media.mediaState}
        agentVisualState={agentVisualState}
        agentStatusLabel={agentStatusLabel}
        features={features}
        shelfCount={settings.shelfEnabled && settings.shelfShowCount ? fileShelf.items.length : null}
        weatherBadge={<WeatherBadge weather={weather} onOpen={() => openEnabledPage("weather")} />}
        clockIndicator={<ClockIndicator settings={settings} active={mode === "collapsed" && !isTucked} />}
        petIndicator={settings.petEnabled && <IslandPet active={mode === "collapsed" && !isTucked}
          state={resolvePetState({ notice: hasMessagePreview, agentAttention: settings.agentStatusEnabled && agentVisualState === "attention",
            agentWorking: settings.agentStatusEnabled && agentVisualState === "running", focusing: settings.todoEnabled && timers.some(round => !round.notified),
            musicPlaying: settings.musicEnabled && (media.mediaState.playbackStatus === "playing" || (media.mediaState.playbackStatus === "unavailable" && media.mediaState.audioActive)) })} />}
        systemStatus={systemStatus}
        cpuEnabled={settings.cpuEnabled}
        memoryEnabled={settings.memoryEnabled}
        compactCollapsed={presentation.compact || (!settings.collapsedAutoWidth && settings.collapsedWidth <= 280)}
        quotaAlert={quotaAlert}
        onOpenPage={openEnabledPage}
        onWindowDragStart={startIslandDrag}
        onCollapse={collapseIsland}
        onResetPosition={resetIslandPosition}
        minimizesToTray={settings.minimizeAction === "tray"}
        onMinimize={settings.minimizeAction === "tray" ? minimizeIsland : minimizeToEdge}
        onOpenTranslator={settings.translationEnabled ? openTranslator : null}
        onOpenSettings={openSettings}
        onTuck={tuckIsland}
        onReveal={hoverTucked}
        onPageChange={setPage}
        pageActions={page === "agents" && (
          <AgentArrangeButton sort={settings.agentSessionSort} group={settings.agentSessionGroup} onChange={(patch) => setSettings({ ...settings, ...patch })} />
        )}
      >
        <IslandPages
          weather={weather}
          page={page}
          mode={mode}
          settings={settings}
          onSettingsChange={setSettings}
          detachedSettings={detachedSettings}
          onDetachedSettingsChange={(value) => void changePresentation(value)}
          onSettingsHeight={reportSettingsHeight}
          features={features}
          qqMail={qqMail}
          qqNotifications={qqNotifications}
          wechatReminders={wechatReminders}
          messageSource={messageSource}
          openMessages={openMessages}
          media={media}
          clipboard={clipboard}
          agentSessions={listedAgentSessions}
          unseenAgentSessions={unseenAgentSessions}
          agentRemoval={agentRemoval}
          alertedSession={alertedSession}
          agentApprovals={agentApprovals}
          agentUsages={agentUsages}
          fileShelf={fileShelf}
          isShelfDropping={isShelfDropping}
          notebookProps={notebookProps}
        />
      </IslandShell>
    </main>
  );
}
