@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ========================================
echo   九宫风水 - 本地预览（部署前测试）
echo ========================================
echo.

taskkill /F /IM node.exe > nul 2>&1

if exist dist rmdir /s /q dist

echo [1/2] 构建中...
call npx expo export --platform web
if errorlevel 1 (
    echo [X] 构建失败
    pause
    exit /b 1
)

echo.
echo [2/2] 启动本地预览服务器...
echo.
echo   电脑浏览器打开:  http://localhost:5555
echo   手机同 WiFi 打开: http://192.168.31.222:5555
echo.
echo   预览没问题后，关闭此窗口（Ctrl+C），运行 deploy.bat 部署到 Cloudflare
echo.
cd dist
call npx http-server . -p 5555 --cors -s
