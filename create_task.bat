@echo off
echo Creating scheduled task for Git Auto Commit...

schtasks /create /tn "Git Auto Commit" /tr "C:\Users\kanop\work\MKG-app\auto_commit.bat" /sc hourly /mo 1 /st 00:00 /f

if %errorlevel% equ 0 (
    echo Task created successfully!
    echo The task will run every hour starting from midnight.
    schtasks /query /tn "Git Auto Commit"
) else (
    echo Failed to create task. Error code: %errorlevel%
)