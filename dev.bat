@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  Spider-Man: Darkest Day - dev server
echo  %~dp0
echo ==========================================
call npm run dev
pause
