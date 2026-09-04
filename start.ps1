Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Launching Farmer to Buyer Direct Marketplace" -ForegroundColor Green
Write-Host "  Backend API:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Frontend Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green

$rootDir = $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\api'; npm.cmd run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\web'; npm.cmd run dev"

Write-Host "`nBoth API (Port 5000) and Web (Port 3000) servers launched!" -ForegroundColor Yellow
