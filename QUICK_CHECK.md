# ⚡ クイックチェックリスト

## 🔄 開発開始前（毎回）

```bash
# 1. プロセス確認
npm run process:check

# 2. 必要に応じてプロセス終了
npm run process:kill

# 3. キャッシュクリア & サーバー起動
npm run dev:clean
```

## ❌ 問題発生時

```bash
# 構文エラー・動作不良の場合
dev-process-manager.bat
# → [2] 全プロセス終了
# → [5] キャッシュクリア
# → [3] 単一サーバー起動
```

## ✅ 開発終了時

```bash
# プロセス終了
npm run process:kill

# 手動コミット
git add .
git commit -m "変更内容"
git push
```

## 🚫 絶対禁止

- ❌ 自動コミット機能の使用
- ❌ 複数サーバーの同時起動
- ❌ エラー状態でのコミット