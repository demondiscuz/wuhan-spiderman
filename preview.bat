@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  Spider-Man: Darkest Day - preview dist
echo  %~dp0
echo ==========================================
if not exist dist (
  echo dist not found. Run build.bat first.
  pause
  exit /b 1
)
call npm run preview
pause
