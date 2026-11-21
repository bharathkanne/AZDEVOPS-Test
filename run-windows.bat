@echo off
REM ============================================================
REM  Vehicle Management CMS - One-click setup & run (Windows)
REM  Double-click this file, or run it from Command Prompt.
REM ============================================================
cd /d "%~dp0"

echo.
echo  Vehicle Management CMS - Setup
echo  ==============================
echo.

REM --- Check Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed.
    echo.
    echo  Please install Node.js LTS ^(version 20 or 22^) from:
    echo  https://nodejs.org
    echo.
    echo  After installing, run this file again.
    pause
    exit /b 1
)

echo  Node.js found:
node -v
echo.

REM --- Install dependencies if needed ---
if not exist "node_modules\" (
    echo  Installing dependencies... ^(first run only, may take a few minutes^)
    where bun >nul 2>nul
    if not errorlevel 1 (
        call bun install
    ) else (
        call npm install --legacy-peer-deps
    )
    if errorlevel 1 (
        echo.
        echo  [ERROR] Dependency install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
) else (
    echo  Dependencies already installed. Skipping install.
)

echo.
echo  Starting the app...
echo  When it is ready, open your browser at:  http://localhost:8080
echo  Press Ctrl+C in this window to stop the app.
echo.

call npm run dev
pause
