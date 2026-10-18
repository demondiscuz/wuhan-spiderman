@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  Spider-Man: Darkest Day - build
echo  %~dp0
echo ==========================================
if not exist node_modules (
  echo [1/2] node_modules not found, running npm install...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check network / registry.
    pause
    exit /b 1
  )
)
echo [2/2] npm run build
call npm run build
if errorlevel 1 (
  echo Build failed. See output above.
  pause
  exit /b 1
)
echo.
echo Build done. Output: %~dp0dist
echo Next: double-click preview.bat
pause
