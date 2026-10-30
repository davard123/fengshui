@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ========================================
echo   九宫风水 - 一键打包并提交 App Store
echo   （云端打包，不需要 Mac）
echo ========================================
echo.

where node > nul 2>&1
if errorlevel 1 (
    echo [X] 没有安装 Node.js，请先到 https://nodejs.org 下载 LTS 版安装
    pause
    exit /b 1
)

echo [1/4] 安装依赖...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo [2/4] 代码检查...
call npm run typecheck
if errorlevel 1 goto :fail

echo.
echo [3/4] 登录 Expo（已登录会自动跳过）...
call npx eas-cli@latest whoami > nul 2>&1
if errorlevel 1 call npx eas-cli@latest login
if errorlevel 1 goto :fail
call npx eas-cli@latest init
if errorlevel 1 goto :fail

echo.
echo [4/4] 云端打包 iOS 并自动提交到 App Store Connect...
echo   第一次运行会问你 Apple ID 和密码（含双重验证码），
echo   以及是否自动生成证书 / App Store Connect API Key —— 全部选 Yes。
echo   打包约 15-25 分钟，完成后自动上传到 TestFlight。
echo.
call npx eas-cli@latest build --platform ios --profile production --auto-submit
if errorlevel 1 goto :fail

echo.
echo ========================================
echo   完成！约 10-30 分钟后在 App Store Connect
echo   的 TestFlight 里可以看到新版本。
echo   第一次运行后 app.json 会多出 projectId，
echo   记得提交到 GitHub（git add app.json ^&^& git commit）。
echo ========================================
pause
exit /b 0

:fail
echo.
echo [X] 出错了，请把上面的错误信息截图发给我
pause
exit /b 1
