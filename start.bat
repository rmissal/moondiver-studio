@echo off
chcp 65001 >nul
title Moondiver Studio

:: Generate ESC character for ANSI formatting
for /F "delims=#" %%E in ('"prompt #$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%E"

:: Set global background to gray-900 (17,24,39) and text to gray-200 (229,231,235)
echo %ESC%[48;2;17;24;39m%ESC%[38;2;229;231;235m
cls

echo.
echo %ESC%[38;2;34;211;238m=======================================================================%ESC%[38;2;229;231;235m
echo          🎵 %ESC%[1mMoondiver Studio%ESC%[0m%ESC%[48;2;17;24;39m%ESC%[38;2;229;231;235m - Audio Mastering Suite
echo %ESC%[38;2;34;211;238m=======================================================================%ESC%[38;2;229;231;235m
echo.

:: Change directory to script folder
cd /d "%~dp0"

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %ESC%[38;2;239;68;68m[ERROR] Node.js was not found!%ESC%[38;2;229;231;235m
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo %ESC%[38;2;250;204;21m[INFO] First run: Installing dependencies...%ESC%[38;2;229;231;235m
    call npm install
    echo.
)

echo %ESC%[38;2;52;211;153m[INFO] Starting Moondiver Studio webserver...%ESC%[38;2;229;231;235m
echo %ESC%[38;2;52;211;153m[INFO] Dashboard: http://localhost:3000%ESC%[38;2;229;231;235m
echo.

:: Open browser after 2 seconds in the background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the server. Redirecting stdin from nul skips the 'Terminate batch job' prompt on Ctrl+C.
npx tsx ui-server.ts < nul

:: Reset ANSI on exit
echo %ESC%[0m