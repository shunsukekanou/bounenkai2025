# コード最適化計画

## 現状
- **ファイルサイズ**: 8,245行 (336KB)
- **主な問題**: 重複コード、未使用コード、過剰なネスト

## 完了した改善

### ✅ 1. PDF生成ユーティリティの作成
- **ファイル**: `utils/pdfGenerator.js`
- **効果**: PDF生成コードの重複を解消（4箇所→1箇所）
- **削減見込み**: 約200行

## 優先順位付き改善ロードマップ

### 🔴 最優先（次回実装）
1. **未使用stateの削除**
   - `archivedReports` (line 357)
   - `dragTaskId` (line 46)
   - `users` (line 411-415) - Supabase認証に移行済み

2. **未使用関数の削除**
   - `getPatrolCheckSettings()` (line 864-914)
   - `getTechnicalSpecifications()` (line 917-952)

3. **PDF生成コードの置き換え**
   - 4箇所のPDF生成コードを`generatePDF()`に置き換え

### 🟡 中優先
4. **カテゴリ検出ロジックの共通化**
   - `detectCategoryFromText`, `detectBestCategory`, `getCategorySuggestions`を統合

5. **管理者判定関数の統一**
   - `isAdmin()`と`isKanoAdmin()`を統合

6. **インラインスタイルの共通化**
   - ボタン、モーダル、フォームスタイルを定数化

### 🟢 長期計画
7. **コンポーネント分割**
   ```
   components/
   ├── Auth/ (認証画面)
   ├── Kaizen/ (カイゼン関連)
   ├── Patrol/ (パトロール関連)
   └── Report/ (報告書関連)
   ```

8. **カスタムフックの作成**
   - `useAuth`, `useAutoSave`など

9. **TypeScript移行**

## 削減見込み
- **短期**: 約500-800行削減（10%削減）
- **中期**: 約1,500-2,000行削減（25%削減）
- **長期**: 約3,000-4,000行削減（40-50%削減）

## 次回実施内容
1. 未使用stateを削除
2. 未使用関数を削除
3. PDF生成を共通関数に置き換え

**実施予定**: 次回セッション
