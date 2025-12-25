; Vörsight Installation Script
; Inno Setup 6.x

#define MyAppName "Vörsight"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Vörsight"
#define MyAppURL "https://github.com/your-repo/vorsight"
#define MyAppServiceExeName "Vorsight.Service.exe"
#define MyAppAgentExeName "Vorsight.Agent.exe"

; Stealth mode naming (changed via preprocessor or runtime)
#ifndef StealthMode
  #define StealthMode 0
#endif

[Setup]
; Basic app info
AppId={{8F4E3D2A-9B7C-4E1D-8A5F-6C3D2B1A0E9F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Default installation directory
#if StealthMode == 1
  DefaultDirName={autopf}\Windows Update Helper
#else
  DefaultDirName={autopf}\Vörsight
#endif

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Output
OutputDir=..\Output
OutputBaseFilename=VorsightSetup
Compression=lzma2
SolidCompression=yes

; UI
WizardStyle=modern
DisableWelcomePage=no
DisableDirPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Service executable and dependencies
Source: "..\publish\Service\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Agent executable
Source: "..\publish\Agent\*"; DestDir: "{app}\Agent"; Flags: ignoreversion recursesubdirs createallsubdirs

; Configuration template (will be modified during install)
Source: "..\src\Vorsight.Service\appsettings.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: ConfigureAppSettings

[Dirs]
; Create directories for runtime data
Name: "{commonappdata}\Vörsight"
Name: "{commonappdata}\Vörsight\logs"
Name: "{commonappdata}\Vörsight\screenshots"

[Code]
var
  ServerUrlPage: TInputQueryWizardPage;
  PresharedKeyPage: TInputQueryWizardPage;
  StealthModePage: TInputOptionWizardPage;
  
  ConfiguredServerUrl: String;
  ConfiguredPSK: String;
  EnableStealthMode: Boolean;

procedure InitializeWizard;
begin
  // Page 1: Server Configuration
  ServerUrlPage := CreateInputQueryPage(wpSelectDir,
    'Server Configuration', 
    'Configure connection to Vörsight server',
    'Enter the URL of your Vörsight server (e.g., http://raspberrypi.local:3000)');
  ServerUrlPage.Add('Server URL:', False);
  ServerUrlPage.Values[0] := 'http://localhost:3000';

  // Page 2: Pre-Shared Key
  PresharedKeyPage := CreateInputQueryPage(ServerUrlPage.ID,
    'Authentication', 
    'Configure authentication key',
    'Enter the pre-shared key (PSK) that matches your server configuration.');
  PresharedKeyPage.Add('Pre-shared Key:', False);
  PresharedKeyPage.Values[0] := '';
  
  // Page 3: Stealth Mode (optional)
  StealthModePage := CreateInputOptionPage(PresharedKeyPage.ID,
    'Installation Mode',
    'Optional: Enable stealth mode for parental monitoring',
    'Stealth mode makes the application less obvious to tech-savvy users by using generic naming.',
    False, False);
  StealthModePage.Add('Use stealth application naming (appears as "Windows Update Helper")');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  if CurPageID = ServerUrlPage.ID then
  begin
    if Trim(ServerUrlPage.Values[0]) = '' then
    begin
      MsgBox('Please enter a server URL.', mbError, MB_OK);
      Result := False;
    end
    else
      ConfiguredServerUrl := Trim(ServerUrlPage.Values[0]);
  end;
  
  if CurPageID = PresharedKeyPage.ID then
  begin
    if Trim(PresharedKeyPage.Values[0]) = '' then
    begin
      MsgBox('Please enter a pre-shared key.', mbError, MB_OK);
      Result := False;
    end
    else
      ConfiguredPSK := Trim(PresharedKeyPage.Values[0]);
  end;
  
  if CurPageID = StealthModePage.ID then
  begin
    EnableStealthMode := StealthModePage.Values[0];
  end;
end;

procedure ConfigureAppSettings();
var
  AppSettingsFile: String;
  FileContent: AnsiString;
  JsonContent: String;
begin
  AppSettingsFile := ExpandConstant('{app}\appsettings.json');
  
  // Read the template appsettings.json
  LoadStringFromFile(AppSettingsFile, FileContent);
  JsonContent := String(FileContent);
  
  // Replace placeholders with user-provided values
  StringChangeEx(JsonContent, '"Url": "http://localhost:3000"', '"Url": "' + ConfiguredServerUrl + '"', True);
  StringChangeEx(JsonContent, '"PresharedKey": "your-secure-key"', '"PresharedKey": "' + ConfiguredPSK + '"', True);
  
  // Adjust paths for Agent executable based on stealth mode
  if EnableStealthMode then
  begin
    StringChangeEx(JsonContent, '"ExecutablePath": "Vorsight.Agent.exe"', '"ExecutablePath": "Agent\\wuhelper.exe"', True);
  end
  else
  begin
    StringChangeEx(JsonContent, '"ExecutablePath": "Vorsight.Agent.exe"', '"ExecutablePath": "Agent\\Vorsight.Agent.exe"', True);
  end;
  
  // Save modified configuration
  SaveStringToFile(AppSettingsFile, AnsiString(JsonContent), False);
end;

[Run]
; Install and start the Windows Service
#if StealthMode == 1
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "install --service-name WindowsUpdateService --display-name ""Windows Update Helper Service"" --description ""Provides background update checking and system health monitoring"""; StatusMsg: "Installing Windows service..."; Flags: runhidden nowait
  Filename: "sc"; Parameters: "start WindowsUpdateService"; StatusMsg: "Starting service..."; Flags: runhidden nowait
#else
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "install"; StatusMsg: "Installing Windows service..."; Flags: runhidden nowait
  Filename: "sc"; Parameters: "start VorsightService"; StatusMsg: "Starting service..."; Flags: runhidden nowait
#endif

[UninstallRun]
; Stop and uninstall the service
#if StealthMode == 1
  Filename: "sc"; Parameters: "stop WindowsUpdateService"; Flags: runhidden waituntilterminated
  Filename: "timeout"; Parameters: "/t 2 /nobreak"; Flags: runhidden waituntilterminated
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "uninstall --service-name WindowsUpdateService"; Flags: runhidden waituntilterminated
#else
  Filename: "sc"; Parameters: "stop VorsightService"; Flags: runhidden waituntilterminated
  Filename: "timeout"; Parameters: "/t 2 /nobreak"; Flags: runhidden waituntilterminated
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "uninstall"; Flags: runhidden waituntilterminated
#endif

[UninstallDelete]
; Clean up runtime data
Type: filesandordirs; Name: "{commonappdata}\Vörsight"
