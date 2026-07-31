; installer.iss
;
; Inno Setup script for T-Tech Studio. Turns the folder produced by
; build_exe.py (backend\dist\TTechStudio\) into a single, real Windows
; installer -- the kind a non-technical person double-clicks, clicks
; "Next" a few times on, and ends up with the app on their Start Menu
; and Desktop, with a proper "Uninstall T-Tech Studio" entry in
; Windows Settings > Apps afterward.
;
; Requires Inno Setup (free): https://jrsoftware.org/isdl.php
; Open this file in the Inno Setup Compiler and click Build > Compile,
; or run from the command line: ISCC.exe installer.iss
;
; Expects build_exe.py to have already been run, so
; backend\dist\TTechStudio\TTechStudio.exe exists.

#define MyAppName "T-Tech Studio"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "T-Tech Suppliers & General Dealers Ltd"
#define MyAppExeName "TTechStudio.exe"
#define MyBuildOutputDir "dist\TTechStudio"

[Setup]
AppId={{8F2C9B41-6C5E-4C7B-9C6E-7A1B2E4F5D6A}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
; Installs into the current user's own folder (no admin prompt needed
; for install) -- matches this app's local-only, single-user, no-login
; design from the original build plan.
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
; The finished installer file itself lands here after compiling.
OutputDir=installer_output
OutputBaseFilename=TTechStudio-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
; A real, standard Windows uninstaller entry -- this is what makes
; "Uninstall T-Tech Studio" appear in Windows Settings > Apps, with no
; extra work needed beyond what's already below.
UninstallDisplayIcon={app}\{#MyAppExeName}
DisableProgramGroupPage=yes
; Comment the next line back in once a real icon exists at
; backend\assets\app.ico (see assets\README.md) and has been baked
; into the exe by build_exe.py.
; SetupIconFile=..\assets\app.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "autostart"; Description: "Start T-Tech Studio automatically when I log in"; GroupDescription: "Startup:"

[Files]
; Everything build_exe.py produced -- the exe plus all the supporting
; files PyInstaller bundled alongside it in --onedir mode.
Source: "{#MyBuildOutputDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; The "start automatically when I log in" checkbox above, done the
; simple way (a Run-key entry) rather than via
; scripts\register_autostart.py's Scheduled Task -- either works, but
; only one should be active at a time to avoid two copies racing to
; open at login. This entry is automatically removed by Windows'
; own uninstaller machinery when the app is uninstalled (see
; [UninstallDelete] below for the parts Windows doesn't clean up on
; its own).
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "TTechStudio"; ValueData: """{app}\{#MyAppExeName}"""; \
    Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch T-Tech Studio now"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; The app's own data -- database, backups, logs -- lives outside the
; install folder (C:\ProgramData\TTechStudio, resolved by
; lifecycle.get_data_dir()) so it survives a re-install or upgrade.
; Uninstalling normally leaves it in place for exactly that reason.
; UNCOMMENT the two lines below only for a genuine full/clean
; uninstall (e.g. decommissioning a machine entirely) -- doing so
; permanently deletes the real business database, with no undo.
;
; Type: filesandordirs; Name: "{commonappdata}\TTechStudio"
