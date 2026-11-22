; NSIS installer hooks, wired in through bundle.windows.nsis.installerHooks.

; Extend Tauri's SetContext before RestorePreviousInstallLocation runs in .onInit.
; This executes for GUI, passive and silent installs. The original /D precedence
; remains in the template: an explicit directory skips RestorePreviousInstallLocation.
!macroundef SetContext
!macro SetContext
  !if "${INSTALLMODE}" == "currentUser"
    SetShellVarContext current
  !else if "${INSTALLMODE}" == "perMachine"
    SetShellVarContext all
  !endif
  ${If} ${RunningX64}
    !if "${ARCH}" == "x64"
      SetRegView 64
    !else if "${ARCH}" == "arm64"
      SetRegView 64
    !else
      SetRegView 32
    !endif
  ${EndIf}
  Push $0
  Push $1
  ReadRegStr $0 SHCTX "Software\focusd\Clockout-island" ""
  ReadRegStr $1 SHCTX "Software\labubu-9527\Clockout-island" ""
  ${If} $1 == ""
  ${AndIf} ${FileExists} "$0\fly-island.exe"
    WriteRegStr SHCTX "Software\labubu-9527\Clockout-island" "" "$0"
  ${EndIf}
  Pop $1
  Pop $0
!macroend

; Show "labubu-9527" as the publisher in Windows' installed-apps list.
;
; The fork publisher is also used by executable metadata and new installer records.
; Keep the previous location as an alias so an older Clockout-island uninstaller
; still finds its install directory after upgrading to this maintainer's build.
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "${UNINSTKEY}" "Publisher" "labubu-9527"
  WriteRegStr SHCTX "Software\focusd\${PRODUCTNAME}" "" "$INSTDIR"
!macroend

; "Delete the application data" also takes the island's AI hooks out of the Codex and
; Claude Code configs, which would otherwise call scripts that no longer exist (#80).
; Before the template deletes the executable, and never for an update's uninstall.
; The executable removes only entries it wrote itself (agent_status/uninstall.rs).
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
  ${AndIf} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
    ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --remove-agent-hooks'
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey SHCTX "Software\focusd\${PRODUCTNAME}"
!macroend
