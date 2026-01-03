@echo off
setlocal EnableExtensions

REM Wechsel in das Verzeichnis der Batch-Datei
pushd "%~dp0" >nul

REM Sicherstellen, dass wir uns im Projektstamm befinden
if not exist "package.json" (
  echo Bitte fuehre dieses Skript im Projektstamm aus.
  set EXITCODE=1
  goto :cleanup
)

REM Pruefen, ob npm verfuegbar ist
where npm >nul 2>&1
if errorlevel 1 (
  echo npm wurde nicht gefunden. Bitte installiere Node.js inklusive npm.
  set EXITCODE=1
  goto :cleanup
)

REM Aktion aus Parameter oder Abfrage bestimmen
set "ACTION=%~1"
if "%ACTION%"=="" (
  call :promptAction
) else (
  call :normalizeAction "%ACTION%"
)

if "%ACTION%"=="" (
  set EXITCODE=1
  goto :cleanup
)

REM Abhaengigkeiten nur bei Bedarf installieren
call :ensureDependencies
if errorlevel 1 (
  set EXITCODE=%ERRORLEVEL%
  goto :cleanup
)

REM Gewaehlten Befehl ausfuehren
if "%ACTION%"=="dev" (
  echo Starte Entwicklungsserver ...
  npm run dev
  set EXITCODE=%ERRORLEVEL%
) else if "%ACTION%"=="build" (
  echo Erstelle Produktionsbuild ...
  npm run build
  set EXITCODE=%ERRORLEVEL%
) else if "%ACTION%"=="prod" (
  call :ensureBuild
  if errorlevel 1 (
    set EXITCODE=%ERRORLEVEL%
    goto :cleanup
  )
  call :startProdServer
  set EXITCODE=%ERRORLEVEL%
) else (
  echo Unbekannte Aktion: %ACTION%
  set EXITCODE=1
)

:cleanup
popd >nul
exit /b %EXITCODE%

REM Uebernimmt Kurzschreibweise und validiert Eingaben
:normalizeAction
set "CHOICE=%~1"
if /I "%CHOICE%"=="dev" set "ACTION=dev" & goto :EOF
if /I "%CHOICE%"=="d" set "ACTION=dev" & goto :EOF
if /I "%CHOICE%"=="build" set "ACTION=build" & goto :EOF
if /I "%CHOICE%"=="b" set "ACTION=build" & goto :EOF
if /I "%CHOICE%"=="prod" set "ACTION=prod" & goto :EOF
if /I "%CHOICE%"=="p" set "ACTION=prod" & goto :EOF
echo Unbekannte Option: %CHOICE%
set "ACTION="
goto :EOF

REM Fragt interaktiv nach der gewuenschten Aktion
:promptAction
echo Was moechtest du tun?
echo   [D] Entwicklungsserver starten
echo   [B] Produktionsbuild erstellen
echo   [P] Produktionsserver starten (baut bei Bedarf)
set /p "ACTION=Auswahl (D/B/P): "
call :normalizeAction "%ACTION%"
goto :EOF

REM Installiert npm-Abhaengigkeiten, falls node_modules fehlt
:ensureDependencies
if exist "node_modules" (
  goto :EOF
)
echo Installiere npm-Abhaengigkeiten ...
npm install
exit /b %ERRORLEVEL%

REM Baut fuer Produktionsstart, falls kein Output existiert
:ensureBuild
if exist ".output" (
  goto :EOF
)
echo Produktionsbuild wird erstellt ...
npm run build
exit /b %ERRORLEVEL%

REM Startet den Produktivserver aus der gebauten Ausgabe
:startProdServer
if not exist ".output\\server\\index.mjs" (
  echo Produktionsserver-Datei fehlt. Bitte fuehre einen Build aus.
  exit /b 1
)
echo Starte Produktionsserver ...
node ".output\\server\\index.mjs"
exit /b %ERRORLEVEL%