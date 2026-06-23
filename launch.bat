@echo off
title OutreachX Launcher Command Center
cd /d "%~dp0"

echo ===================================================
echo             OutreachX Launch Initializer           
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to your system PATH.
    echo Please install Python 3.9+ and try again.
    echo.
    pause
    exit /b 1
)

:: Check if the virtual environment exists in the root
if exist "myenv\Scripts\python.exe" (
    echo [INFO] Activating virtual environment (myenv) and launching...
    "myenv\Scripts\python.exe" launch.py
) else (
    echo [WARNING] "myenv" virtual environment folder not found in project root.
    echo Attempting startup using system python interpreter...
    echo.
    python launch.py
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Launcher script exited with code %errorlevel%.
)

echo.
echo Press any key to close launcher window...
pause >nul
