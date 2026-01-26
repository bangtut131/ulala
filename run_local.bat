@echo off
echo ==============================================
echo HR Auto Screening - Local Development Launcher
echo ==============================================
echo.

echo 1. Starting Backend Server...
start "HR Server (Port 3000)" cmd /k "cd server && node index.js"

echo Waiting for server to spin up...
timeout /t 5 /nobreak >nul

echo 2. Starting Frontend Client...
start "HR Client (Vite)" cmd /k "cd client && npm run dev"

echo.
echo ==============================================
echo Services started!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173 (check client window for actual port)
echo.
echo Keep these windows open to keep the server running.
echo Close them to stop the server.
echo ==============================================
pause
