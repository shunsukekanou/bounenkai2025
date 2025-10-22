@echo off
echo Updating scheduled task for Git Auto Commit...

schtasks /delete /tn "Git Auto Commit" /f
schtasks /create /tn "Git Auto Commit" /tr "C:\Users\kanop\work\MKG-app\auto_commit_simple.bat" /sc hourly /mo 1 /st 00:00 /f

if %errorlevel% equ 0 (
    echo Task updated successfully!
    echo The task will run every hour using auto_commit_simple.bat
    schtasks /query /tn "Git Auto Commit"
) else (
    echo Failed to update task. Error code: %errorlevel%
)