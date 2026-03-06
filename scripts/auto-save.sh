#!/bin/bash
# auto-save.sh — 10分ごとに自動コミット & プッシュ
#
# 使い方:
#   bash scripts/auto-save.sh        # フォアグラウンド実行
#   bash scripts/auto-save.sh &      # バックグラウンド実行
#   kill $(cat .claude/auto-save.pid) # 停止
#
# ログ: .claude/auto-save.log

INTERVAL=600  # 10分（秒）
LOG_FILE=".claude/auto-save.log"
PID_FILE=".claude/auto-save.pid"
DANGEROUS_FILES=".env credentials secrets .local"

# PIDファイルに書き込み
echo $$ > "$PID_FILE"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
    log "Auto-save stopped."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM

log "Auto-save started (every ${INTERVAL}s)"
log "PID: $$"
log "Branch: $(git branch --show-current)"

while true; do
    # 変更チェック
    CHANGES=$(git status --porcelain 2>/dev/null)

    if [ -z "$CHANGES" ]; then
        log "No changes — skipped"
    else
        # 危険なファイルチェック
        SKIP=false
        for pattern in $DANGEROUS_FILES; do
            if echo "$CHANGES" | grep -qi "$pattern"; then
                log "WARNING: Sensitive file detected ($pattern) — skipped"
                SKIP=true
                break
            fi
        done

        if [ "$SKIP" = false ]; then
            # mainブランチチェック
            BRANCH=$(git branch --show-current)
            if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
                log "WARNING: On $BRANCH branch — skipped (create a working branch first)"
            else
                # ファイル数カウント
                FILE_COUNT=$(echo "$CHANGES" | wc -l | tr -d ' ')

                # ステージング
                git add -A

                # コミット
                MSG="Auto-save: ${FILE_COUNT} files changed"
                git commit -m "$(cat <<EOF
${MSG}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

                if [ $? -eq 0 ]; then
                    log "Committed: $MSG"

                    # プッシュ
                    git push 2>/dev/null
                    if [ $? -eq 0 ]; then
                        log "Pushed to origin/$BRANCH"
                    else
                        git push -u origin "$BRANCH" 2>/dev/null
                        if [ $? -eq 0 ]; then
                            log "Pushed (new remote branch) to origin/$BRANCH"
                        else
                            log "ERROR: Push failed"
                        fi
                    fi
                else
                    log "ERROR: Commit failed"
                fi
            fi
        fi
    fi

    sleep $INTERVAL
done
