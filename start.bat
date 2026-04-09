@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
setlocal enabledelayedexpansion
title 検査アプリ起動

echo.
echo =============================================
echo   検査アプリ 起動ツール
echo =============================================
echo.

REM ====================================================
REM STEP 1: Node.js (npm) の確認
REM ====================================================
echo [STEP 1] Node.js の確認...
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo  *** エラー: Node.js がインストールされていません ***
    echo.
    echo  インストール手順:
    echo    1. https://nodejs.org/ にアクセス
    echo    2. "LTS" ボタンをクリックしてダウンロード
    echo    3. インストーラーを実行する
    echo    4. インストール完了後、このファイルを再実行してください
    echo.
    start "" "https://nodejs.org/"
    goto :ERROR_EXIT
)
for /f "tokens=*" %%v in ('npm --version 2^>nul') do set NPM_VER=%%v
echo         OK  (npm v!NPM_VER!)

REM ====================================================
REM STEP 2: node_modules の確認 (初回 npm install)
REM ====================================================
echo [STEP 2] パッケージの確認...
if not exist "node_modules\" (
    echo         node_modules が見つかりません。npm install を実行します。
    echo         初回は数分かかります。このまま待ってください
    echo.
    npm install
    set NPM_ERR=!errorlevel!
    echo.
    if !NPM_ERR! neq 0 (
        echo  *** エラー: npm install が失敗しました exitcode=!NPM_ERR! ***
        echo.
        echo  よくある原因:
        echo    - インターネットに接続されていない
        echo    - ファイアウォール/プロキシがブロックしている
        echo    - package.json が壊れている
        goto :ERROR_EXIT
    )
    echo         OK  インストール完了
) else (
    echo         OK
)

REM ====================================================
REM STEP 3: 起動モード判定
REM ====================================================
echo [STEP 3] 起動モードの確認...
set USE_FIREBASE=0

findstr /R "^import App from.*firebase" src\main.jsx >nul 2>&1
if not errorlevel 1 set USE_FIREBASE=1

if !USE_FIREBASE!==1 (
    echo         Firebase版 - PocketBase は使用しません
    goto :START_VITE
)
echo         PocketBase版

REM ====================================================
REM STEP 4: PocketBase の確認・自動ダウンロード
REM ====================================================
echo [STEP 4] PocketBase の確認...

if not exist "pocketbase.exe" (
    echo         pocketbase.exe が見つかりません。自動ダウンロードを開始します。
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { ^
        Write-Host '         GitHub API から最新バージョンを取得中...'; ^
        $rel = Invoke-WebRequest -Uri 'https://api.github.com/repos/pocketbase/pocketbase/releases/latest' -UseBasicParsing | ConvertFrom-Json; ^
        $ver = $rel.tag_name; ^
        Write-Host ('         最新バージョン: ' + $ver); ^
        $asset = $rel.assets | Where-Object { $_.name -like '*windows_amd64*.zip' } | Select-Object -First 1; ^
        if (-not $asset) { throw 'ダウンロードURLが見つかりません' } ^
        $url = $asset.browser_download_url; ^
        Write-Host ('         ダウンロード中: ' + $asset.name + ' ...'); ^
        Invoke-WebRequest -Uri $url -OutFile 'pb_download.zip' -UseBasicParsing; ^
        Write-Host '         解凍中...'; ^
        Expand-Archive -Path 'pb_download.zip' -DestinationPath '.' -Force; ^
        Remove-Item 'pb_download.zip'; ^
        Write-Host '         ダウンロード完了!'; ^
    } catch { ^
        Write-Host ('         *** ダウンロードエラー: ' + $_.Exception.Message + ' ***'); ^
        exit 1 ^
    }"

    if not exist "pocketbase.exe" (
        echo.
        echo  *** エラー: PocketBase のダウンロードに失敗しました ***
        echo.
        echo  手動でダウンロードしてください:
        echo    https://pocketbase.io/docs/
        echo    Windows (amd64) の zip を解凍して pocketbase.exe を
        echo    このフォルダに置いてから再実行してください。
        echo.
        start "" "https://pocketbase.io/docs/"
        goto :ERROR_EXIT
    )
)
for /f "tokens=*" %%v in ('.\pocketbase.exe --version 2^>nul') do set PB_VER=%%v
echo         OK  (!PB_VER!)

REM ====================================================
REM PocketBase 起動
REM ====================================================
set IS_FIRST_RUN=0
if not exist "pb_data\" set IS_FIRST_RUN=1

echo.
echo  PocketBase を起動しています...
start "PocketBase Server" cmd /k "title [PocketBase] && .\pocketbase.exe serve --http=0.0.0.0:8090"

if !IS_FIRST_RUN!==0 goto :START_VITE

REM ====================================================
REM 初回セットアップウィザード (pb_data がない初回のみ)
REM ====================================================
echo.
echo  =============================================
echo   初回セットアップ
echo  =============================================
echo.
echo  PocketBase の起動を待っています... (4秒)
timeout /t 4 /nobreak >nul

echo  ブラウザで管理者アカウント作成画面を開きます。
start "" "http://localhost:8090/_/"
echo.
echo  -----------------------------------------
echo   手順:
echo     1. ブラウザが開いたら Email を入力
echo     2. Password を設定 (8文字以上)
echo     3. "Create and login" ボタンを押す
echo  -----------------------------------------
echo.
echo  アカウントの作成が完了したら Enter キーを押してください。
pause >nul

REM 入力ループ (空入力チェックあり)
:SETUP_INPUT
echo.
set "PB_EMAIL="
set /p PB_EMAIL=  管理者メールアドレス:
if "!PB_EMAIL!"=="" (
    echo  入力されていません。もう一度入力してください。
    goto :SETUP_INPUT
)

echo.
echo  パスワードを入力してください (入力は非表示になります):
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command ^
    "$s = Read-Host '  パスワード' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "PB_PASSWORD=%%P"

if "!PB_PASSWORD!"=="" (
    echo  パスワードが入力されていません。もう一度入力してください。
    goto :SETUP_INPUT
)

echo.
echo  データベースを初期化しています...
node setup_db_v3.mjs "!PB_EMAIL!" "!PB_PASSWORD!"
set SETUP_ERR=!errorlevel!

if !SETUP_ERR! neq 0 (
    echo.
    echo  *** DB初期化に失敗しました ***
    echo.
    echo  よくある原因:
    echo    - メールアドレスまたはパスワードが間違っている
    echo    - PocketBase がまだ完全に起動していない - 少し待ってから再試行
    echo.
    set "RETRY="
    set /p RETRY=  再試行しますか？ [y/n]:
    if /i "!RETRY!"=="y" goto :SETUP_INPUT
    echo.
    echo  セットアップをスキップします。
    echo  後から手動で実行する場合:
    echo    node setup_db_v3.mjs メール パスワード
    echo.
    goto :START_VITE
)
echo.
echo  データベースの初期化が完了しました！

REM ====================================================
REM Vite 起動
REM ====================================================
:START_VITE
echo.
echo  フロントエンドを起動しています...
echo  (ブラウザが自動で開きます)
start "Vite Dev Server" cmd /k "title [Vite] && npm run dev -- --host --open"

echo.
echo =============================================
echo   起動が完了しました！
echo   [PocketBase] と [Vite] の黒いウィンドウは
echo   アプリ使用中は閉じないでください。
echo =============================================
echo.
goto :DONE

REM ====================================================
REM エラー終了
REM ====================================================
:ERROR_EXIT
echo.
echo  問題が解決したら、このファイルを再実行してください。
echo.

:DONE
pause
