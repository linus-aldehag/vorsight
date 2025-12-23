@echo off
REM Run Vorsight installer with detailed logging
echo Installing Vorsight with verbose logging...
echo.
echo Log file will be created at: %TEMP%\vorsight-install.log
echo.
pause

msiexec /i "src\Vorsight.Setup\bin\DEBUG\VorsightSetup.msi" /L*V "%TEMP%\vorsight-install.log"

echo.
echo Installation complete!
echo Opening log file...
notepad "%TEMP%\vorsight-install.log"
