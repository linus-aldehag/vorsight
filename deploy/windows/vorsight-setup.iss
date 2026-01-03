; Vörsight Installation Script
; Inno Setup 6.x

#define MyAppName "Vörsight"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Vörsight"
#define MyAppURL "https://github.com/your-repo/vorsight"
#define MyAppServiceExeName "Vorsight.Service.exe"
#define MyAppAgentExeName "Vorsight.Agent.exe"

[Setup]
; Basic app info
AppId={{8F4E3D2A-9B7C-4E1D-8A5F-6C3D2B1A0E9F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Architecture settings for 64-bit installation
; This ensures installation to "Program Files" instead of "Program Files (x86)"
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

; Default installation directory
DefaultDirName={autopf}\Vörsight

; Privileges - Must be admin for Windows Service installation
; (Windows services cannot be installed per-user, only system-wide)
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=commandline

; Output
OutputDir=..\..\Output
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
Source: "..\..\publish\Service\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Agent executable
Source: "..\..\publish\Agent\*"; DestDir: "{app}\Agent"; Flags: ignoreversion recursesubdirs createallsubdirs

; Configuration template (will be modified during install)
; onlyifdoesntexist prevents overwriting during upgrades
Source: "..\..\src\Vorsight.Service\appsettings.json"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist; AfterInstall: ConfigureAppSettings

[Dirs]
; Create directories for runtime data
Name: "{commonappdata}\Vörsight"
Name: "{commonappdata}\Vörsight\logs"
Name: "{commonappdata}\Vörsight\screenshots"

[Code]
var
  ServerConfigPage: TInputQueryWizardPage;
  PresharedKeyPage: TInputQueryWizardPage;
  
  ConfiguredServerUrl: String;
  ConfiguredPSK: String;

const
  RegKey = 'Software\Vorsight';

function IsAppInstalled(): Boolean;
var
  UninstallKey: String;
  InstallPath: String;
begin
  // Check registry instead of file system to avoid accessing {app} before it's defined
  // This prevents crashes when {app} constant isn't initialized yet
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{8F4E3D2A-9B7C-4E1D-8A5F-6C3D2B1A0E9F}_is1';
  Result := RegQueryStringValue(HKEY_LOCAL_MACHINE, UninstallKey, 'InstallLocation', InstallPath);
  if Result then
    Log('Found existing installation at: ' + InstallPath);
end;

function IsUpgrade(): Boolean;
begin
  // Check if this is an upgrade installation
  Result := IsAppInstalled;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // If upgrading, stop the service before installation
  if IsUpgrade then
  begin
    Log('Detected upgrade installation. Stopping service: VorsightService');
    
    // Stop the service
    Exec('sc', 'stop VorsightService', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
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
    ServerConfigPage := CreateInputQueryPage(wpSelectDir,
      'Server Configuration', 
      'Configure connection to Vörsight server',
      'Enter the address and port of your Vörsight server (e.g., raspberrypi.local or 192.168.1.100)');
    ServerConfigPage.Add('Server Address:', False);
    ServerConfigPage.Add('Server Port:', False);
    ServerConfigPage.Values[0] := '';  // Server address - empty by default
    ServerConfigPage.Values[1] := '3000';  // Port - defaults to 3000

    // Page 2: Pre-Shared Key
    PresharedKeyPage := CreateInputQueryPage(ServerConfigPage.ID,
      'Authentication', 
      'Configure authentication key',
      'Enter the pre-shared key (PSK) that matches your server configuration.');
    PresharedKeyPage.Add('Pre-shared Key:', False);
    PresharedKeyPage.Values[0] := '';
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  ServerAddress: String;
  ServerPort: String;
  PortNum: Integer;
begin
  Result := True;
  
  // Only validate configuration pages during fresh installation
  if not IsUpgrade then
  begin
    if CurPageID = ServerConfigPage.ID then
    begin
      ServerAddress := Trim(ServerConfigPage.Values[0]);
      ServerPort := Trim(ServerConfigPage.Values[1]);
      
      if ServerAddress = '' then
      begin
        MsgBox('Please enter a server address (e.g., raspberrypi.local or 192.168.1.100).', mbError, MB_OK);
        Result := False;
      end
      else if ServerPort = '' then
      begin
        MsgBox('Please enter a server port.', mbError, MB_OK);
        Result := False;
      end
      else
      begin
        PortNum := StrToIntDef(ServerPort, 0);
        if (PortNum <= 0) or (PortNum > 65535) then
        begin
          MsgBox('Please enter a valid port number (1-65535).', mbError, MB_OK);
          Result := False;
        end
        else
        begin
          // Construct the full URL from server address and port
          ConfiguredServerUrl := 'http://' + ServerAddress + ':' + ServerPort;
        end;
      end;
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
  
  // Set standard agent executable path
  StringChangeEx(JsonContent, '"ExecutablePath": "Vorsight.Agent.exe"', '"ExecutablePath": "Agent\\Vorsight.Agent.exe"', True);
  
  // Save modified configuration
  SaveStringToFile(AppSettingsFile, AnsiString(JsonContent), False);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Stop the service
    Exec('sc', 'stop VorsightService', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Wait for service to fully stop
    Sleep(2000);
    
    // Uninstall the service
    Exec(ExpandConstant('{app}\{#MyAppServiceExeName}'), 'uninstall', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Clean up registry
    RegDeleteKeyIncludingSubkeys(HKEY_LOCAL_MACHINE, RegKey);
  end;
end;

[Run]
; Install and start the Windows Service
; Always install/reinstall the service to ensure it exists before starting
Filename: "{app}\{#MyAppServiceExeName}"; Parameters: "install"; StatusMsg: "Installing Windows service..."; Flags: runhidden waituntilterminated
Filename: "sc"; Parameters: "start VorsightService"; StatusMsg: "Starting service..."; Flags: runhidden waituntilterminated

[UninstallDelete]
; Clean up runtime data
Type: filesandordirs; Name: "{commonappdata}\Vörsight"
