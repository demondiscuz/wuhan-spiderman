@echo off
rem ============================================
rem  部署主站（Cloudflare Pages）：构建 + 自检 + 上传
rem  用法：deploy.bat
rem ============================================
cd /d "%~dp0"

call npm run build
if errorlevel 1 (
  echo [错误] 构建失败，终止部署
  exit /b 1
)

rem 自检：构建产物不得包含开发路径 /src/（防止再次把源码目录传上线）
findstr /C:"/src/" dist\index.html >nul 2>&1
if not errorlevel 1 (
  echo [错误] dist\index.html 仍包含开发路径 /src/，禁止部署！
  exit /b 1
)

echo [OK] 自检通过（dist 为构建产物），开始部署到 Cloudflare Pages...
npx -y wrangler pages deploy dist --project-name=wuhanspiderman --branch=main
