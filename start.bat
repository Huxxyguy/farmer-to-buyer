@echo off
title Farmer to Buyer Marketplace Launcher
echo ========================================================
echo   Launching Farmer to Buyer Direct Marketplace
echo   Backend API:  http://localhost:5000
echo   Frontend Web: http://localhost:3000
echo ========================================================
echo.

start "Fastify Backend API (Port 5000)" cmd /k "cd /d %~dp0api && npm run dev"
start "Next.js Web Frontend (Port 3000)" cmd /k "cd /d %~dp0web && npm run dev"

echo Waiting for servers to start...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo Done! Servers are running and browser opened to http://localhost:3000.

