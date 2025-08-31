@echo off
echo 正在启动证件照换底色工具...
echo.
echo 请选择启动方式：
echo 1. Python HTTP服务器
echo 2. Node.js HTTP服务器
echo 3. 直接打开HTML文件
echo.
set /p choice="请输入选择 (1-3): "

if "%choice%"=="1" (
    echo 正在启动Python服务器...
    python -m http.server 8000
    if errorlevel 1 (
        echo Python未安装或启动失败！
        echo 请安装Python或选择其他选项
        pause
        exit
    )
    echo.
    echo 服务器已启动！
    echo 请在浏览器中访问: http://localhost:8000
    echo 按Ctrl+C停止服务器
    pause
) else if "%choice%"=="2" (
    echo 正在启动Node.js服务器...
    npx http-server
    if errorlevel 1 (
        echo Node.js未安装或启动失败！
        echo 请安装Node.js或选择其他选项
        pause
        exit
    )
) else if "%choice%"=="3" (
    echo 正在打开HTML文件...
    start index.html
    echo 应用已在默认浏览器中打开
    pause
) else (
    echo 无效选择！
    pause
)
