# Gemini用 クイックスタートガイド

## 🎯 Gemini開始時の必須手順

### 1. 即座に実行
```bash
cd MKG-app
npm run dev
```

### 2. 必読ファイル（順番通り）
1. **AI_HANDOVER_SYSTEM.md** - バトンタッチシステム全体
2. **PROJECT_STATUS.md** - 現在の詳細状況
3. **DEVELOPMENT_GUIDELINES.md** - 重要な開発方針
4. **RECENT_CHANGES.md** - 最新の変更履歴

### 3. プロジェクト状況確認
```bash
# サーバー状況確認
curl -s http://localhost:3001 | head -5

# ログ確認（直近のエラーチェック）
# 開発サーバーのコンソール出力を確認
```

## 🚨 Gemini向け重要事項

### ユーザーからの厳格な指導内容
1. **「テスト確認は却下」** → 完全実装まで責任を持つ
2. **「場当たり的対応でなく本格運用念頭」** → 迂回・回避禁止
3. **「プログラム上でerrorなく正しく動作するかチェック」** → ユーザーテスト前の徹底検証必須
4. **「回避や迂回は逃げずに対処」** → 根本的解決の徹底

### 技術的制約
- データベース操作迂回禁止
- 正しいSupabase RLS政策必須
- 複数チーム所属者は毎回チーム選択表示

## 🔧 現在の技術構成（Gemini確認用）

### 稼働環境
- **URL:** http://localhost:3001
- **フレームワーク:** Next.js 14.2.32
- **データベース:** Supabase PostgreSQL
- **認証:** Supabase Auth + RLS

### 実装済み機能
- ユーザー登録・ログイン
- チーム選択（6チーム定義）
- 基本認証フロー

## 📝 Gemini作業完了時の義務

### 必須更新ファイル
1. **PROJECT_STATUS.md** - 作業後の状況更新
2. **RECENT_CHANGES.md** - 変更内容の詳細記録
3. **DEVELOPMENT_GUIDELINES.md** - 新しい学習内容があれば追記

### 引き継ぎフォーマット
```markdown
## YYYY-MM-DD Gemini Session
**作業内容:**
**解決した問題:**
**確認済み動作:**
**次回への申し送り:**
```

## 🎯 Gemini開始時の確認コマンド

```bash
# プロジェクトディレクトリ移動
cd MKG-app

# サーバー起動確認
npm run dev

# 基本動作確認
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001

# 環境変数確認
echo "Supabase設定: $([ -f .env.local ] && echo '存在' || echo '不在')"
```

---
**Gemini様、このガイドに従って作業開始をお願いします。品質の継続性が重要です。**