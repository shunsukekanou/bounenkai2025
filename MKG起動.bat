@echo off
chcp 65001 >nul
REM MKG改善活動システム起動スクリプト
REM Chromeプロファイル選択画面を表示してアプリを起動

echo.
echo ========================================
echo   MKG改善活動システム 起動中...
echo ========================================
echo.

REM サーバーURLを設定（3001を優先、次に3000）
set SERVER_URL=http://localhost:3001

echo サーバーURL: %SERVER_URL%
echo.

REM Chromeのパスを探す
set CHROME_PATH=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
)

if "%CHROME_PATH%"=="" (
    echo [エラー] Google Chromeが見つかりません
    echo.
    echo Chromeをインストールしてから再度実行してください
    echo.
    pause
    exit
)

echo Chromeのプロファイル選択画面を開きます...
echo パス: %CHROME_PATH%
echo.

REM Chromeのプロファイル選択画面を開いてアプリを起動
start "" "%CHROME_PATH%" --profile-picker-startup "%SERVER_URL%"

echo.
echo ========================================
echo   起動完了
echo ========================================
echo.
echo Chromeでプロファイルを選択してください
echo.
echo ※ もしアプリが表示されない場合は、
echo   以下のURLを手動でChromeに入力してください:
echo   %SERVER_URL%
echo.

pause
