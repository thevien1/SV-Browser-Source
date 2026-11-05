; Preserve cores BEFORE the previous uninstaller removes the app directory.
; Covers the first upgrade from releases that stored cores in resources/drivers.
!macro PreserveLegacyDriverRoot ROOT
  ${If} ${FileExists} "${ROOT}\*.*"
    CreateDirectory "$R9"
    nsExec::ExecToStack '"$SYSDIR\robocopy.exe" "${ROOT}" "$R9" /E /XC /XN /XO /R:1 /W:1 /NFL /NDL /NJH /NJS'
    Pop $R7
    Pop $R6
    ${If} $R7 == "error"
    ${OrIf} $R7 == "timeout"
      SetErrorLevel 1
      Abort "Cannot preserve Chromium drivers. Update cancelled."
    ${ElseIf} $R7 >= 8
      SetErrorLevel 1
      Abort "Cannot preserve Chromium drivers. Update cancelled."
    ${EndIf}
  ${EndIf}
!macroend

!macro PreserveLegacyInstall ROOTKEY
  ReadRegStr $R8 ${ROOTKEY} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $R8 != ""
    !insertmacro PreserveLegacyDriverRoot "$R8\resources\drivers"
    !insertmacro PreserveLegacyDriverRoot "$R8\drivers"
  ${EndIf}
!macroend

!macro customInit
  Push $R6
  Push $R7
  Push $R8
  Push $R9
  SetShellVarContext current
  StrCpy $R9 "$APPDATA\sv-browser\SVBrowserData\drivers"
  !insertmacro PreserveLegacyInstall HKCU
  !insertmacro PreserveLegacyInstall HKLM
  ${If} $installMode == "all"
    SetShellVarContext all
  ${EndIf}
  Pop $R9
  Pop $R8
  Pop $R7
  Pop $R6
!macroend
