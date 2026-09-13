@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动预览服务器...
start "" http://127.0.0.1:8765/presentation.html
node "%~dp0preview-server.js"
pause
