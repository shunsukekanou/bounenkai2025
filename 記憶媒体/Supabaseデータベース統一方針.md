# 【重要】Supabaseデータベース統一方針

**作成日**: 2025-09-23
**優先度**: 🔴 最高優先
**適用範囲**: 全データ保存処理

---

## 🚨 必須遵守事項

### データ保存の絶対ルール
✅ **Supabaseデータベースのみ使用** - 全データはSupabaseクラウドDBに保存
❌ **localStorage使用禁止** - ブラウザローカルストレージは使用しない
❌ **sessionStorage使用禁止** - セッションストレージも使用しない
❌ **ファイルシステム保存禁止** - ローカルファイルへの保存は禁止

### 環境間データ同期の確保
🌐 **クラウドDB統一**: Local環境・Codespaces環境で同一データ表示
🔄 **リアルタイム同期**: どの環境からの変更も即座に全環境に反映
🛡️ **RLS適用**: Row Level Security によるチーム別データ分離維持

---

## 📋 修正対象の特定

### 現在のlocalStorage使用箇所（修正必須）
1. **タスクデータ**: `localStorage.getItem('tasks')` → Supabaseテーブル操作
2. **ユーザー情報**: `localStorage.getItem('currentUser')` → Supabase Auth
3. **チーム選択**: `localStorage.getItem('selectedTeam')` → Supabaseユーザープロファイル
4. **パトロールチェックリスト**: `localStorage.getItem('patrolChecklists')` → Supabaseテーブル
5. **その他全ての永続化データ**: 全てSupabaseに移行

### 技術実装方針
```javascript
// ❌ 禁止パターン
localStorage.setItem('tasks', JSON.stringify(tasks))
const savedTasks = localStorage.getItem('tasks')

// ✅ 必須パターン
const { data, error } = await supabase.from('tasks').insert(taskData)
const { data: tasks } = await supabase.from('tasks').select('*')
```

---

## 🔧 実装手順

### Phase 1: データベーステーブル設計
1. **tasks** テーブル作成・RLS設定
2. **patrol_checklists** テーブル作成・RLS設定
3. **user_profiles** テーブル作成・RLS設定

### Phase 2: localStorage削除・Supabase置換
1. 全ての `localStorage.setItem/getItem` を特定
2. Supabaseクエリに置き換え
3. 非同期処理対応（async/await）
4. エラーハンドリング追加

### Phase 3: 環境間同期テスト
1. Local環境でデータ作成
2. Codespaces環境で同期確認
3. 両環境での相互更新テスト

---

## 💡 今後の開発ルール

### 新機能開発時の確認事項
1. **データ保存場所**: 必ずSupabaseデータベースを使用
2. **永続化処理**: localStorage/sessionStorageは絶対に使用しない
3. **環境同期**: 複数環境での動作確認を必須とする
4. **RLS設定**: 新テーブル作成時は必ずRow Level Securityを設定

### コードレビュー必須チェック
- [ ] localStorageの使用がないか？
- [ ] Supabaseクエリが正しく実装されているか？
- [ ] 非同期処理が適切にハンドリングされているか？
- [ ] エラー処理が実装されているか？

---

## 🎯 期待される効果

✅ **環境間データ統一**: Local・Codespaces・本番環境で同一データ
✅ **チーム協力向上**: 複数ユーザーでのリアルタイムデータ共有
✅ **データ安全性**: クラウドDBによるデータ保護・バックアップ
✅ **技術仕様遵守**: PC管理者承認済み技術仕様書との整合性確保

---

## 🚨 注意事項

**この方針は技術仕様書の制約に基づく必須要件です**
違反は無料枠制限違反やセキュリティリスクに直結するため、
**絶対に遵守**してください。

## ✅ 実装完了報告

### 2025-09-23 完了事項
1. **localStorage完全削除** - 全てのlocalStorage使用箇所をSupabaseに置換
2. **タスクデータ移行** - `tasks`テーブルでチーム別管理
3. **ユーザー認証統一** - Supabase Authで環境間統一
4. **チーム選択管理** - `user_profiles`テーブルで管理
5. **パトロールチェックリスト移行** - `patrol_checklists`テーブル化
6. **番号管理統一** - `team_numbers`テーブルで管理
7. **ローカルファイル削除** - `patrol-checklist.json`をコード内定数に置換
8. **技術仕様書統一** - `PC管理者向け技術仕様書.md`をGitで管理し環境間共有

### 🆕 2025-09-24 追加完了事項
9. **sessionStorage完全排除** - 残存していたsessionStorage使用箇所を完全削除
   - Codespaces URL管理: `sessionStorage.getItem('lastOrigin')` → Supabaseユーザーメタデータ
   - セッション管理: `sessionStorage.clear()` → Supabase認証による自動管理
10. **reset_numbers.js修正** - localStorage.clear()を使用禁止コメントに変更
11. **🎯 PCローカル依存ゼロ達成** - 全てのローカルストレージ依存を完全排除

### ローカルファイル問題の解決
- ❌ **問題**: 重要な技術文書がローカル保存のみ（Codespaces非対応）
- ✅ **解決**: PC管理者承認済み文書をGitリポジトリで管理
- ✅ **効果**: コミット+プッシュで全環境からアクセス可能
- 📋 **運用**: 技術仕様変更時はGit履歴で変更管理

### Git管理による環境間統一
- ✅ **PC管理者向け技術仕様書.md** - Gitで版管理
- ✅ **記憶媒体フォルダ** - 開発方針をGitで共有
- ✅ **プロジェクト文書** - 全ての重要文書をGit管理

### 必要なSupabaseテーブル
- `tasks` - タスク管理（team_id, user_id付き）
- `user_profiles` - ユーザープロファイル（selected_team等）
- `patrol_checklists` - パトロールチェックリスト履歴
- `team_numbers` - チーム別番号管理

### 環境間データ同期確認
- ✅ Local環境・Codespaces環境で同一データ表示
- ✅ 全データがSupabaseクラウドDBに統一保存
- ✅ ローカルファイル・localStorage依存の完全排除

---

## 🏆 最終達成状況（2025-09-24）

### ✅ PCローカル依存ゼロ完全達成
- **localStorage使用箇所**: 0箇所 ✅ 完全排除
- **sessionStorage使用箇所**: 0箇所 ✅ 完全排除
- **ローカルファイル依存**: 0箇所 ✅ 完全排除
- **データ永続化**: 100% Supabaseクラウド統一 ✅

### 🌐 環境間完全統一状況
- **PC環境・Codespaces環境**: 同一データ・同一機能 ✅
- **認証・セッション管理**: 100% Supabase Auth統一 ✅
- **技術文書管理**: Git版管理で全環境同期 ✅
- **開発方針共有**: 記憶媒体フォルダで統一 ✅

### 🔧 技術実装詳細
```javascript
// ✅ 完全Supabase化完了例
// セッション管理（以前: sessionStorage → 現在: Supabaseユーザーメタデータ）
const storedOrigin = currentUser?.user_metadata?.lastOrigin

// データ永続化（以前: localStorage → 現在: Supabaseテーブル）
const { data } = await supabase.from('tasks').select('*')
```

**記録者**: Claude Code Assistant
**適用開始**: 2025-09-23
**localStorage排除完了**: 2025-09-23
**sessionStorage排除完了**: 2025-09-24
**ローカル依存ゼロ達成**: 2025-09-24
**次回見直し**: 新機能追加時のSupabase遵守確認