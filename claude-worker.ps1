# claude-worker.ps1
# Claude Code 24/7 Worker for Windows
# Usage: .\claude-worker.ps1

$TaskFile = "tasks\queue.txt"
$DoneFile = "tasks\done.txt"
$LogFile  = "tasks\claude.log"

function Write-Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# tasks フォルダがなければ作成
New-Item -ItemType Directory -Force -Path "tasks" | Out-Null

# queue.txt がなければ作成
if (-not (Test-Path $TaskFile)) {
    New-Item -ItemType File -Path $TaskFile | Out-Null
    Write-Log "queue.txt を作成しました。タスクを追記してください。"
}

# done.txt がなければ作成
if (-not (Test-Path $DoneFile)) {
    New-Item -ItemType File -Path $DoneFile | Out-Null
}

Write-Log "=============================="
Write-Log " Claude Code Worker 起動"
Write-Log "=============================="
Write-Log "タスクファイル: $TaskFile"
Write-Log "ログファイル:   $LogFile"
Write-Log "Ctrl+C で停止できます"
Write-Log ""

while ($true) {
    # キューを読み込む
    $lines = Get-Content -Path $TaskFile -Encoding UTF8 -ErrorAction SilentlyContinue |
             Where-Object { $_.Trim() -ne "" -and -not $_.StartsWith("#") }

    if (-not $lines -or $lines.Count -eq 0) {
        Write-Log "タスクなし。60秒後に再チェック..."
        Start-Sleep -Seconds 60
        continue
    }

    # 先頭タスクを取得
    $task = if ($lines -is [array]) { $lines[0] } else { $lines }
    $task = $task.Trim()

    # キューから先頭行を削除
    $remaining = $lines | Select-Object -Skip 1
    if ($remaining) {
        Set-Content -Path $TaskFile -Value $remaining -Encoding UTF8
    } else {
        Clear-Content -Path $TaskFile
    }

    Write-Log "-------------------------------"
    Write-Log "タスク開始: $task"
    Write-Log "-------------------------------"

    # Claude Code 実行
    $prompt = @"
以下のタスクを実装してください（プロジェクト: azuretier.net）:
$task

完了後に以下を順番に行ってください:
1. npm run lint を実行し、エラーがあれば修正する
2. git add -A を実行する
3. git commit -m "feat: $task" を実行する
4. 実装内容を3行以内で要約して報告する
"@

    claude --print $prompt 2>&1 | Tee-Object -FilePath $LogFile -Append

    # 完了リストに追記
    Add-Content -Path $DoneFile -Value "[$( Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $task" -Encoding UTF8

    Write-Log "タスク完了: $task"
    Write-Log ""

    # 次のタスクまで少し待機
    Start-Sleep -Seconds 10
}