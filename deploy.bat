@echo off
cd /d "%~dp0"

echo ============================================
echo   Firebase Hosting Deploy Tool
echo ============================================
echo.

set FIREBASE=npx firebase

echo [1/3] Checking Firebase login...
call %FIREBASE% projects:list >nul 2>&1
if errorlevel 1 (
    echo.
    echo Browser will open. Please login with Google.
    echo.
    call %FIREBASE% login
    if errorlevel 1 (
        echo Login failed.
        pause
        exit /b 1
    )
)
echo Login OK!

echo.
echo [2/3] Building app...
call npm run build
if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
)
echo Build OK!

echo.
echo [3/3] Deploying to Firebase...
call %FIREBASE% deploy --only hosting
if errorlevel 1 (
    echo Deploy failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   DONE! Access your app at:
echo   https://inspection-time-c4fd3.web.app
echo ============================================
echo.
pause
