@echo off
REM =============================================
REM MKG-app 開発プロセス管理スクリプト
REM =============================================

set "PROJECT_DIR=%~dp0"
set "LOG_FILE=%PROJECT_DIR%dev-processes.log"

:main
echo ===========================================
echo   MKG-app 開発プロセス管理システム
echo ===========================================
echo.
echo [1] 現在のプロセス状況確認
echo [2] 全プロセス終了（クリーンアップ）
echo [3] 単一サーバー起動
echo [4] ポート状況確認
echo [5] キャッシュクリア
echo [0] 終了
echo.
set /p choice="選択してください (0-5): "

if "%choice%"=="1" goto check_processes
if "%choice%"=="2" goto kill_all_processes
if "%choice%"=="3" goto start_single_server
if "%choice%"=="4" goto check_ports
if "%choice%"=="5" goto clear_cache
if "%choice%"=="0" goto end
echo 無効な選択です。
goto main

:check_processes
echo.
echo === 現在のNext.jsプロセス ===
netstat -ano | findstr :300 | findstr LISTENING
echo.
echo === Node.jsプロセス数 ===
tasklist /fi "imagename eq node.exe" | find /c "node.exe"
echo.
pause
goto main

:kill_all_processes
echo.
echo === 全プロセス終了中 ===
echo %date% %time% - プロセス終了開始 >> "%LOG_FILE%"
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul
echo プロセス終了完了
echo %date% %time% - プロセス終了完了 >> "%LOG_FILE%"
echo.
pause
goto main

:start_single_server
echo.
echo === 単一サーバー起動中 ===
echo %date% %time% - サーバー起動開始 >> "%LOG_FILE%"
cd /d "%PROJECT_DIR%"
start "MKG Development Server" cmd /k "npm run dev"
echo サーバーを別ウィンドウで起動しました
echo %date% %time% - サーバー起動完了 >> "%LOG_FILE%"
echo.
pause
goto main

:check_ports
echo.
echo === ポート3000-3010の使用状況 ===
for /L %%i in (3000,1,3010) do (
    netstat -ano | findstr :%%i | findstr LISTENING >nul
    if !errorlevel! equ 0 (
        echo ポート %%i: 使用中
    ) else (
        echo ポート %%i: 空き
    )
)
echo.
pause
goto main

:clear_cache
echo.
echo === キャッシュクリア中 ===
echo %date% %time% - キャッシュクリア開始 >> "%LOG_FILE%"
cd /d "%PROJECT_DIR%"
if exist ".next" (
    echo .nextフォルダを削除中...
    rmdir /s /q .next >nul 2>&1
    echo .nextフォルダを削除しました
) else (
    echo .nextフォルダは存在しません
)
echo %date% %time% - キャッシュクリア完了 >> "%LOG_FILE%"
echo.
pause
goto main

:end
echo.
echo システムを終了します。
exit /b 0