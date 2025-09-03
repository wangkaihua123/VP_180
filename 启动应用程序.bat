@echo off
chcp 65001 > nul
title 优亿测试应用程序启动器

echo ========================================
echo    优亿测试应用程序启动器
echo ========================================
echo.

echo 正在启动后端服务...
cd /d "%~dp0backend"
start /B "Backend Server" cmd /c "python app.py && pause"

echo 等待后端服务启动...
timeout /t 5 /nobreak > nul

echo 正在构建前端应用...
cd /d "%~dp0frontend"
start /B "Frontend Build" cmd /c "npm run build && pause"

echo 等待前端构建完成...
timeout /t 30 /nobreak > nul

echo 正在启动前端服务...
cd /d "%~dp0frontend"
start /B "Frontend Server" cmd /c "npm run start && pause"

echo 等待前端服务启动...
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo    应用程序已启动！
echo ========================================
echo.
echo 后端服务运行在: http://localhost:5000
echo 前端服务运行在: http://localhost:3000
echo 注意：如果端口已被使用，请使用实际的端口
echo.
echo 如需停止服务，请关闭此窗口。
echo.
pause