# Git Auto Commit タスクスケジューラー設定スクリプト

$TaskName = "Git Auto Commit"
$Description = "MKG-appの自動コミットとプッシュ"
$BatchFile = "C:\Users\kanop\work\MKG-app\auto_commit.bat"
$WorkingDirectory = "C:\Users\kanop\work\MKG-app"

# 既存のタスクがあるか確認して削除
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "既存のタスクを削除しました。"
} else {
    Write-Host "既存のタスクはありませんでした。"
}

# アクションの定義
$Action = New-ScheduledTaskAction -Execute $BatchFile -WorkingDirectory $WorkingDirectory

# トリガーの定義（1時間ごと）
$StartTime = (Get-Date).AddMinutes(1)
$Trigger = New-ScheduledTaskTrigger -Once -At $StartTime -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)

# 設定の定義
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# タスクの直接登録
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description $Description

Write-Host "タスク '$TaskName' が正常に作成されました。"
Write-Host "1時間ごとに $BatchFile が実行されます。"

# タスクの確認
Get-ScheduledTask -TaskName $TaskName | Format-Table TaskName, State