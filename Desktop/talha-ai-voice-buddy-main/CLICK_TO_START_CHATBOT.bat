@echo off
title Mohammed Talha AI - One Click Start
echo ==========================================
echo    MOHAMMED TALHA AI - STARTING UP
echo ==========================================
echo.

:: Start the Vite development server in the background
echo [1/2] Starting Backend Server...
start /b cmd /c "npm run dev"

:: Wait for the server to start (5 seconds)
echo [2/2] Waiting for server to initialize...
timeout /t 5 /nobreak > nul

:: Open the Chatbot in a clean App-like window (Widget Mode)
echo.
echo Launching Chatbot Widget...
start chrome --app=http://localhost:8081 --user-data-dir="%TEMP%\TalhaAIWidgetProfile" --window-size=400,700 --window-position=1450,50

echo.
echo ==========================================
echo    DONE! Your Chatbot is now LIVE.
echo    Minimize this window to keep it running.
echo ==========================================
echo.
pause
