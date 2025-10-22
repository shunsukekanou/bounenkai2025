@echo off
REM デスクトップにMKGアプリのショートカットを作成

echo.
echo ========================================
echo   デスクトップショートカット作成
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop

echo 作成場所: %DESKTOP%
echo ショートカット名: MKGアプリ
echo.

REM 一時的なVBScriptファイルを作成してショートカット作成
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%DESKTOP%\MKGアプリ.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_DIR%MKG起動.bat"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%"
echo oLink.Description = "MKGアプリを起動"
echo oLink.Save
) > "%TEMP%\CreateShortcut.vbs"

REM VBScriptを実行
cscript //nologo "%TEMP%\CreateShortcut.vbs"

REM 一時ファイルを削除
del "%TEMP%\CreateShortcut.vbs"

if exist "%DESKTOP%\MKGアプリ.lnk" (
    echo.
    echo [成功] ショートカットを作成しました！
    echo.
    echo デスクトップの「MKGアプリ」をダブルクリックして起動できます。
) else (
    echo.
    echo [エラー] ショートカットの作成に失敗しました
    echo.
    echo 手動でショートカットを作成してください：
    echo 1. デスクトップで右クリック - 新規作成 - ショートカット
    echo 2. 項目の場所: %SCRIPT_DIR%MKG起動.bat
    echo 3. 名前: MKGアプリ
)

echo.
pause
