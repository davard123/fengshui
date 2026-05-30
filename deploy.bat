@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ========================================
echo   九宫风水 - 一键部署到 Cloudflare Pages
echo ========================================
echo.

REM 杀掉可能占用端口的 node 进程
taskkill /F /IM node.exe > nul 2>&1

REM 清理旧 dist
if exist dist (
    echo [1/3] 清理旧构建...
    rmdir /s /q dist
)

echo [1/3] 开始构建静态网站（约 30-60 秒）...
echo.
call npx expo export --platform web
if errorlevel 1 (
    echo.
    echo [X] 构建失败，请检查上面的错误信息
    pause
    exit /b 1
)

echo.
echo [2/3] 检查构建产物...
if not exist dist\index.html (
    echo [X] 没有生成 dist\index.html，构建可能失败
    pause
    exit /b 1
)

echo.
echo [3/3] 推送到 Cloudflare Pages（约 10-30 秒）...
echo.
call wrangler pages deploy dist --project-name=fengshui --commit-dirty=true --branch=main
if errorlevel 1 (
    echo.
    echo [X] 部署失败，请检查上面的错误信息
    pause
    exit /b 1
)

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo.
echo   永久访问地址:
echo   https://fengshui-78g.pages.dev
echo.
echo   iPhone Safari 打开 → 分享 → 添加到主屏幕
echo ========================================
echo.
pause
