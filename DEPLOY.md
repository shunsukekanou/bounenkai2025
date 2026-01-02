# Vercelデプロイ設定手順

## 環境変数の設定

デプロイしたアプリで「TypeError: Failed to fetch」エラーが発生する場合は、Vercelの環境変数が設定されていない可能性があります。

### Vercelでの環境変数設定方法

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com にアクセス
   - 自分のプロジェクト（bounenkai2025）を選択

2. **環境変数の設定画面を開く**
   - 上部メニューから「Settings」をクリック
   - 左側メニューから「Environment Variables」をクリック

3. **環境変数を追加**

   以下の2つの環境変数を追加してください：

   **変数名:** `NEXT_PUBLIC_SUPABASE_URL`
   **値:** `https://kwgcaefclgttujeyylon.supabase.co`
   **適用環境:** Production, Preview, Development（すべてチェック）

   **変数名:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   **値:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z2NhZWZjbGd0dHVqZXl5bG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODUxNzQsImV4cCI6MjA3Nzk2MTE3NH0.zcxcb6lsUtn7dIUXsCt3S2TwDvai3VSdv_r4ZeMo1Tg`
   **適用環境:** Production, Preview, Development（すべてチェック）

4. **再デプロイ**

   環境変数を追加した後は、再デプロイが必要です：

   - Vercelの「Deployments」タブに移動
   - 最新のデプロイの右側にある「...」メニューをクリック
   - 「Redeploy」を選択
   - 「Redeploy」ボタンをクリック

5. **確認**

   再デプロイが完了したら、アプリにアクセスして「新しいゲームを作成する」ボタンを押してエラーが解消されたか確認してください。

## トラブルシューティング

### エラーが継続する場合

1. **ブラウザのキャッシュをクリア**
   - ブラウザで Ctrl+Shift+R（Mac: Cmd+Shift+R）を押してハードリロード

2. **環境変数が正しく設定されているか確認**
   - Vercelの「Environment Variables」画面で、2つの変数が表示されているか確認
   - スペルミスや余分な空白がないか確認

3. **デプロイログを確認**
   - Vercelの「Deployments」タブで最新のデプロイをクリック
   - ビルドログにエラーがないか確認

## ローカル開発

ローカル開発では、`.env.local`ファイルに以下を記載してください：

```
NEXT_PUBLIC_SUPABASE_URL=https://kwgcaefclgttujeyylon.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z2NhZWZjbGd0dHVqZXl5bG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzODUxNzQsImV4cCI6MjA3Nzk2MTE3NH0.zcxcb6lsUtn7dIUXsCt3S2TwDvai3VSdv_r4ZeMo1Tg
```
