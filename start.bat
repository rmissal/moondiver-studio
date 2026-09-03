@echo off
chcp 65001 >nul
title Moondiver Studio
color 0B

echo.
echo =======================================================================
echo          🎵 Moondiver Studio - Audio Mastering Suite
echo =======================================================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js was not found!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] First run: Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting Moondiver Studio webserver...
echo [INFO] Dashboard: http://localhost:3000
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

node ui-server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [INFO] Server stopped.
    pause
)
