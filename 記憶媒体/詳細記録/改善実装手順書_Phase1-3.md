# MKG-app 改善実装手順書（Phase 1-3）

**作成日**: 2025-10-18
**対象プロジェクト**: MKG改善活動システム
**前提**: 詳細分析レポート（MKG-app_詳細分析レポート_2025-10-18.md）に基づく

---

## 🎯 実装計画概要

全体を3つのPhaseに分けて段階的に改善を実施します。

| Phase | 内容 | 優先度 | 所要時間 | 本番運用可否 |
|-------|------|--------|----------|-------------|
| Phase 1 | データベース基盤の完全化 | 🔴 最高 | 1週間 | ⚠️ 試験運用可 |
| Phase 2 | セキュリティ強化 | 🔴 高 | 3日 | ✅ 本番運用可 |
| Phase 3 | コード品質向上 | 🟡 中 | 2日 | ✅ 最適化完了 |

---

## 📊 Phase 1: データベース基盤の完全化（1週間）

**目標**: 欠落しているテーブル定義を作成し、データ型を統一する

### ステップ1.1: 欠落テーブルのCREATE TABLE文作成（2時間）

#### 実行内容

1. **新規SQLファイルの作成**

ファイル名: `setup_complete_tables.sql`

```sql
-- ==========================================
-- MKG-app 欠落テーブル定義
-- 作成日: 2025-10-18
-- 目的: completed_reports, patrol_checklists, admin_users, kaizen_plans, ai_consultations の完全定義
-- ==========================================

-- 1. completed_reports テーブル（活動報告書）
CREATE TABLE IF NOT EXISTS completed_reports (
  id SERIAL PRIMARY KEY,
  task_id INTEGER,
  title TEXT NOT NULL,
  report_number TEXT, -- チーム別改善ナンバー（例: LB-2510-0001）
  report_data JSONB NOT NULL,
  team_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_draft BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_completed_reports_team_id ON completed_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_completed_reports_user_id ON completed_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_reports_is_draft ON completed_reports(is_draft);
CREATE INDEX IF NOT EXISTS idx_completed_reports_report_number ON completed_reports(report_number);

-- RLS有効化
ALTER TABLE completed_reports ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "completed_reports_auth_select" ON completed_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_insert" ON completed_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_update" ON completed_reports
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_delete" ON completed_reports
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 2. patrol_checklists テーブル（パトロールチェックシート）
CREATE TABLE IF NOT EXISTS patrol_checklists (
  id BIGINT PRIMARY KEY,
  basic_info JSONB NOT NULL,
  evaluations JSONB NOT NULL,
  comments JSONB NOT NULL,
  iso_items JSONB,
  total_score INTEGER DEFAULT 0,
  score_counts JSONB DEFAULT '{}',
  score_difference INTEGER DEFAULT 0,
  last_score INTEGER,
  previous_score INTEGER,
  team_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_team_id ON patrol_checklists(team_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_user_id ON patrol_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_saved_at ON patrol_checklists(saved_at);

-- RLS有効化
ALTER TABLE patrol_checklists ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "patrol_checklists_auth_select" ON patrol_checklists
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_insert" ON patrol_checklists
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_update" ON patrol_checklists
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_delete" ON patrol_checklists
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 3. admin_users テーブル（管理者ユーザー管理）
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- RLS有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全認証ユーザーが閲覧可能、挿入・更新・削除は管理者のみ）
CREATE POLICY "admin_users_select" ON admin_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_users_insert" ON admin_users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "admin_users_update" ON admin_users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "admin_users_delete" ON admin_users
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ==========================================

-- 4. kaizen_plans テーブル（カイゼン計画）
CREATE TABLE IF NOT EXISTS kaizen_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  current_problem TEXT,
  target_goal TEXT,
  team_id TEXT NOT NULL,
  kaizen_number TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_team_id ON kaizen_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_user_id ON kaizen_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_kaizen_number ON kaizen_plans(kaizen_number);

-- RLS有効化
ALTER TABLE kaizen_plans ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "kaizen_plans_auth_select" ON kaizen_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_insert" ON kaizen_plans
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_update" ON kaizen_plans
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_delete" ON kaizen_plans
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 5. ai_consultations テーブル（AI相談履歴）
CREATE TABLE IF NOT EXISTS ai_consultations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ai_consultations_user_id ON ai_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_team_id ON ai_consultations(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_created_at ON ai_consultations(created_at);

-- RLS有効化
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "ai_consultations_auth_select" ON ai_consultations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_insert" ON ai_consultations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_update" ON ai_consultations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_delete" ON ai_consultations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ 5つのテーブル（completed_reports, patrol_checklists, admin_users, kaizen_plans, ai_consultations）の作成が完了しました';
  RAISE NOTICE '✅ インデックスとRLSポリシーの基本設定が完了しました';
  RAISE NOTICE '⚠️  Phase 2でチーム別データ分離のRLSポリシーを追加してください';
END $$;
```

2. **Supabaseダッシュボードでの実行**

手順:
1. Supabaseダッシュボードにログイン
2. 左メニュー → SQL Editor
3. 「New Query」をクリック
4. 上記SQLをコピー&ペースト
5. 「Run」ボタンをクリック
6. 実行結果を確認（✅ Success メッセージを確認）

3. **テーブル作成の確認**

確認SQL:
```sql
-- テーブル一覧を確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'completed_reports',
    'patrol_checklists',
    'admin_users',
    'kaizen_plans',
    'ai_consultations'
  )
ORDER BY table_name;

-- 各テーブルの構造を確認
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'completed_reports',
    'patrol_checklists',
    'admin_users',
    'kaizen_plans',
    'ai_consultations'
  )
ORDER BY table_name, ordinal_position;
```

---

### ステップ1.2: データ型の統一（3時間）

#### 実行内容

1. **データ型統一SQLファイルの作成**

ファイル名: `migrate_data_types.sql`

```sql
-- ==========================================
-- MKG-app データ型統一マイグレーション
-- 作成日: 2025-10-18
-- 目的: user_idとteam_idの型を統一
-- ==========================================

-- ⚠️ 重要: 実行前に必ずバックアップを取得してください

-- ==========================================
-- STEP 1: user_id型の統一（INTEGER → UUID）
-- ==========================================

-- 1.1 tasksテーブルのuser_id型を確認
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'tasks' AND column_name = 'user_id';

  RAISE NOTICE 'tasks.user_id の現在の型: %', current_type;
END $$;

-- 1.2 tasksテーブルのuser_id型を修正
-- ⚠️ データが存在する場合は慎重に実行
ALTER TABLE tasks
  ALTER COLUMN user_id TYPE UUID
  USING CASE
    WHEN user_id IS NULL THEN NULL
    ELSE user_id::TEXT::UUID
  END;

RAISE NOTICE '✅ tasks.user_id をUUID型に変更しました';

-- 1.3 user_profilesテーブルのuser_id型を修正
ALTER TABLE user_profiles
  ALTER COLUMN user_id TYPE UUID
  USING CASE
    WHEN user_id IS NULL THEN NULL
    ELSE user_id::TEXT::UUID
  END;

RAISE NOTICE '✅ user_profiles.user_id をUUID型に変更しました';

-- ==========================================
-- STEP 2: team_id型の統一（teamIdカラムの削除）
-- ==========================================

-- 2.1 tasksテーブルのteamIdカラムを確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'teamId'
  ) THEN
    RAISE NOTICE '⚠️  tasksテーブルにteamIdカラムが存在します';

    -- 2.2 team_idとteamIdの値が一致しているか確認
    IF EXISTS (
      SELECT 1 FROM tasks
      WHERE team_id IS DISTINCT FROM "teamId"
    ) THEN
      RAISE WARNING '⚠️  team_idとteamIdの値に不一致があります！';
      RAISE WARNING '⚠️  手動でデータを確認してからteamIdカラムを削除してください';
    ELSE
      -- 2.3 teamIdカラムを削除
      ALTER TABLE tasks DROP COLUMN IF EXISTS "teamId";
      RAISE NOTICE '✅ tasksテーブルのteamIdカラムを削除しました（team_idに統一）';
    END IF;
  ELSE
    RAISE NOTICE '✅ tasksテーブルにteamIdカラムは存在しません（既に統一済み）';
  END IF;
END $$;

-- ==========================================
-- STEP 3: 外部キー制約の追加
-- ==========================================

-- 3.1 completed_reports.user_id に外部キー制約を追加（既に定義済み）
-- 3.2 patrol_checklists.user_id に外部キー制約を追加（既に定義済み）
-- 3.3 kaizen_plans.user_id に外部キー制約を追加（既に定義済み）
-- 3.4 ai_consultations.user_id に外部キー制約を追加（既に定義済み）

RAISE NOTICE '✅ 外部キー制約は既にsetup_complete_tables.sqlで設定済みです';

-- ==========================================
-- STEP 4: インデックスの再構築（型変更後）
-- ==========================================

-- 4.1 tasksテーブルのuser_idインデックスを再構築
DROP INDEX IF EXISTS idx_tasks_user_id;
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- 4.2 user_profilesテーブルのuser_idインデックスを再構築
DROP INDEX IF EXISTS idx_user_profiles_user_id;
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

RAISE NOTICE '✅ インデックスの再構築が完了しました';

-- ==========================================
-- STEP 5: 最終確認
-- ==========================================

DO $$
DECLARE
  tasks_user_id_type TEXT;
  user_profiles_user_id_type TEXT;
BEGIN
  -- user_id型の確認
  SELECT data_type INTO tasks_user_id_type
  FROM information_schema.columns
  WHERE table_name = 'tasks' AND column_name = 'user_id';

  SELECT data_type INTO user_profiles_user_id_type
  FROM information_schema.columns
  WHERE table_name = 'user_profiles' AND column_name = 'user_id';

  RAISE NOTICE '========================================';
  RAISE NOTICE '最終確認結果:';
  RAISE NOTICE 'tasks.user_id の型: %', tasks_user_id_type;
  RAISE NOTICE 'user_profiles.user_id の型: %', user_profiles_user_id_type;
  RAISE NOTICE '========================================';

  IF tasks_user_id_type = 'uuid' AND user_profiles_user_id_type = 'uuid' THEN
    RAISE NOTICE '✅ データ型の統一が完了しました！';
  ELSE
    RAISE WARNING '⚠️  データ型の統一に失敗しています。手動で確認してください。';
  END IF;
END $$;
```

2. **バックアップの取得**

実行前に必ずバックアップを取得:
```sql
-- tasksテーブルのバックアップ
CREATE TABLE tasks_backup_20251018 AS SELECT * FROM tasks;

-- user_profilesテーブルのバックアップ
CREATE TABLE user_profiles_backup_20251018 AS SELECT * FROM user_profiles;
```

3. **マイグレーションの実行**

手順:
1. Supabaseダッシュボード → SQL Editor
2. バックアップSQLを実行
3. `migrate_data_types.sql`を実行
4. 実行結果とエラーログを確認

4. **アプリケーション動作確認**

確認項目:
- [ ] ログイン機能が正常に動作
- [ ] タスク一覧が正常に表示
- [ ] タスク追加が正常に動作
- [ ] チーム選択が正常に動作
- [ ] 報告書作成が正常に動作

---

### ステップ1.3: Phase 1完了確認（0.5時間）

#### 確認SQL

```sql
-- ==========================================
-- Phase 1 完了確認SQL
-- ==========================================

-- 1. 必要なテーブルがすべて存在するか確認
SELECT
  CASE
    WHEN COUNT(*) = 10 THEN '✅ 全テーブル存在'
    ELSE '❌ テーブル不足: ' || (10 - COUNT(*))::TEXT || '個'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tasks', 'user_profiles', 'team_numbers', 'employees', 'custom_users',
    'completed_reports', 'patrol_checklists', 'admin_users',
    'kaizen_plans', 'ai_consultations'
  );

-- 2. user_id型がUUIDに統一されているか確認
SELECT
  table_name,
  column_name,
  data_type,
  CASE
    WHEN data_type = 'uuid' THEN '✅ UUID型'
    ELSE '❌ 型不一致: ' || data_type
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN ('tasks', 'user_profiles', 'completed_reports', 'patrol_checklists', 'kaizen_plans', 'ai_consultations')
ORDER BY table_name;

-- 3. RLSが有効化されているか確認
SELECT
  tablename AS table_name,
  CASE
    WHEN rowsecurity THEN '✅ RLS有効'
    ELSE '❌ RLS無効'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tasks', 'user_profiles', 'team_numbers', 'employees', 'custom_users',
    'completed_reports', 'patrol_checklists', 'admin_users',
    'kaizen_plans', 'ai_consultations'
  )
ORDER BY tablename;

-- 4. インデックスが作成されているか確認
SELECT
  tablename AS table_name,
  indexname AS index_name,
  indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'completed_reports', 'patrol_checklists', 'admin_users',
    'kaizen_plans', 'ai_consultations'
  )
ORDER BY tablename, indexname;
```

#### Phase 1 完了チェックリスト

- [ ] 5つの欠落テーブル（completed_reports, patrol_checklists, admin_users, kaizen_plans, ai_consultations）が作成された
- [ ] 全テーブルでRLSが有効化されている
- [ ] user_id型がUUIDに統一されている
- [ ] teamIdカラムが削除され、team_idに統一されている
- [ ] 必要なインデックスが作成されている
- [ ] アプリケーションが正常に動作する

---

## 🔒 Phase 2: セキュリティ強化（3日）

**目標**: チーム別データ分離を実装し、データ漏洩リスクを排除する

### ステップ2.1: チーム別RLSポリシー実装（4時間）

#### 実行内容

1. **チーム別RLSポリシーSQLファイルの作成**

ファイル名: `setup_team_based_rls.sql`

```sql
-- ==========================================
-- MKG-app チーム別RLSポリシー設定
-- 作成日: 2025-10-18
-- 目的: チーム別データ分離の実装
-- ==========================================

-- ⚠️ 重要: 現在のRLSポリシーをバックアップしてから実行してください

-- ==========================================
-- STEP 1: 既存の緩いポリシーを削除
-- ==========================================

-- tasksテーブル
DROP POLICY IF EXISTS "mkg_auth_tasks_select" ON tasks;
DROP POLICY IF EXISTS "mkg_auth_tasks_insert" ON tasks;
DROP POLICY IF EXISTS "mkg_auth_tasks_update" ON tasks;
DROP POLICY IF EXISTS "mkg_auth_tasks_delete" ON tasks;

-- completed_reportsテーブル
DROP POLICY IF EXISTS "completed_reports_auth_select" ON completed_reports;
DROP POLICY IF EXISTS "completed_reports_auth_insert" ON completed_reports;
DROP POLICY IF EXISTS "completed_reports_auth_update" ON completed_reports;
DROP POLICY IF EXISTS "completed_reports_auth_delete" ON completed_reports;

-- patrol_checklistsテーブル
DROP POLICY IF EXISTS "patrol_checklists_auth_select" ON patrol_checklists;
DROP POLICY IF EXISTS "patrol_checklists_auth_insert" ON patrol_checklists;
DROP POLICY IF EXISTS "patrol_checklists_auth_update" ON patrol_checklists;
DROP POLICY IF EXISTS "patrol_checklists_auth_delete" ON patrol_checklists;

-- kaizen_plansテーブル
DROP POLICY IF EXISTS "kaizen_plans_auth_select" ON kaizen_plans;
DROP POLICY IF EXISTS "kaizen_plans_auth_insert" ON kaizen_plans;
DROP POLICY IF EXISTS "kaizen_plans_auth_update" ON kaizen_plans;
DROP POLICY IF EXISTS "kaizen_plans_auth_delete" ON kaizen_plans;

-- ai_consultationsテーブル
DROP POLICY IF EXISTS "ai_consultations_auth_select" ON ai_consultations;
DROP POLICY IF EXISTS "ai_consultations_auth_insert" ON ai_consultations;
DROP POLICY IF EXISTS "ai_consultations_auth_update" ON ai_consultations;
DROP POLICY IF EXISTS "ai_consultations_auth_delete" ON ai_consultations;

RAISE NOTICE '✅ 既存のRLSポリシーを削除しました';

-- ==========================================
-- STEP 2: チーム別制限付きRLSポリシーの作成
-- ==========================================

-- 【重要】現在ログイン中のユーザーの選択中チームIDを取得する関数
-- user_metadata.last_team_id を使用

-- 2.1 tasksテーブル: チーム別制限
CREATE POLICY "team_based_tasks_select" ON tasks
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_tasks_insert" ON tasks
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_tasks_update" ON tasks
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_tasks_delete" ON tasks
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

RAISE NOTICE '✅ tasksテーブルのチーム別RLSポリシーを作成しました';

-- 2.2 completed_reportsテーブル: チーム別制限
CREATE POLICY "team_based_reports_select" ON completed_reports
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_reports_insert" ON completed_reports
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_reports_update" ON completed_reports
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_reports_delete" ON completed_reports
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

RAISE NOTICE '✅ completed_reportsテーブルのチーム別RLSポリシーを作成しました';

-- 2.3 patrol_checklistsテーブル: チーム別制限
CREATE POLICY "team_based_patrol_select" ON patrol_checklists
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_patrol_insert" ON patrol_checklists
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_patrol_update" ON patrol_checklists
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_patrol_delete" ON patrol_checklists
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

RAISE NOTICE '✅ patrol_checklistsテーブルのチーム別RLSポリシーを作成しました';

-- 2.4 kaizen_plansテーブル: チーム別制限
CREATE POLICY "team_based_kaizen_select" ON kaizen_plans
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_kaizen_insert" ON kaizen_plans
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_kaizen_update" ON kaizen_plans
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_kaizen_delete" ON kaizen_plans
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

RAISE NOTICE '✅ kaizen_plansテーブルのチーム別RLSポリシーを作成しました';

-- 2.5 ai_consultationsテーブル: チーム別制限
CREATE POLICY "team_based_ai_select" ON ai_consultations
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_ai_insert" ON ai_consultations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_ai_update" ON ai_consultations
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "team_based_ai_delete" ON ai_consultations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  team_id = (
    SELECT user_metadata->>'last_team_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

RAISE NOTICE '✅ ai_consultationsテーブルのチーム別RLSポリシーを作成しました';

-- ==========================================
-- STEP 3: 全社監査ビュー用の特別ポリシー追加
-- ==========================================

-- 全社監査ビューでは全チームのデータを閲覧可能にする
-- （ただし、管理者のみアクセス可能）

CREATE POLICY "admin_audit_view_tasks" ON tasks
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "admin_audit_view_reports" ON completed_reports
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "admin_audit_view_patrol" ON patrol_checklists
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

RAISE NOTICE '✅ 管理者向け全社監査ビュー用RLSポリシーを作成しました';

-- ==========================================
-- STEP 4: 完了確認
-- ==========================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('tasks', 'completed_reports', 'patrol_checklists', 'kaizen_plans', 'ai_consultations');

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ チーム別RLSポリシーの設定が完了しました';
  RAISE NOTICE '作成されたポリシー数: %', policy_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '次のステップ: アプリケーションで各チームのデータ分離を確認してください';
END $$;
```

2. **RLSポリシーの実行**

手順:
1. Supabaseダッシュボード → SQL Editor
2. `setup_team_based_rls.sql`を実行
3. 実行結果を確認

3. **チーム別データ分離の動作確認**

確認テスト:
```sql
-- テストユーザーでログインして、以下のSQLを実行
-- （user_metadata.last_team_id が 'LB' のユーザーを想定）

-- LBチームのタスクのみ取得できることを確認
SELECT COUNT(*) AS lb_tasks_count
FROM tasks
WHERE team_id = 'LB';

-- GRチームのタスクは取得できないことを確認（0件のはず）
SELECT COUNT(*) AS gr_tasks_count
FROM tasks
WHERE team_id = 'GR';
```

アプリケーション確認項目:
- [ ] LBチームでログイン → LBチームのデータのみ表示
- [ ] GRチームに切り替え → GRチームのデータのみ表示
- [ ] YLチームに切り替え → YLチームのデータのみ表示
- [ ] 管理者で全社監査ビュー → 全チームのデータ表示
- [ ] 非管理者で全社監査ビュー → エラー表示（アクセス拒否）

---

### ステップ2.2: APIキー暗号化（2時間）

#### 実行内容

1. **pgcryptoエクステンションの有効化**

```sql
-- pgcryptoエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS pgcrypto;

RAISE NOTICE '✅ pgcryptoエクステンションを有効化しました';
```

2. **APIキー暗号化SQLファイルの作成**

ファイル名: `encrypt_api_keys.sql`

```sql
-- ==========================================
-- MKG-app APIキー暗号化マイグレーション
-- 作成日: 2025-10-18
-- 目的: employees.api_keyをpgcryptoで暗号化
-- ==========================================

-- ⚠️ 重要: 実行前に必ずバックアップを取得してください
-- ⚠️ 暗号化キーは環境変数で管理してください（ハードコード禁止）

-- ==========================================
-- STEP 1: バックアップテーブルの作成
-- ==========================================

CREATE TABLE employees_backup_20251018 AS SELECT * FROM employees;

RAISE NOTICE '✅ employeesテーブルのバックアップを作成しました';

-- ==========================================
-- STEP 2: 暗号化カラムの追加
-- ==========================================

-- 既存のapi_keyカラムを残しつつ、暗号化用の新カラムを追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS api_key_encrypted BYTEA;

RAISE NOTICE '✅ api_key_encrypted カラムを追加しました';

-- ==========================================
-- STEP 3: 既存データの暗号化
-- ==========================================

-- ⚠️ 'YOUR_ENCRYPTION_KEY_HERE' を実際の暗号化キーに置き換えてください
-- 暗号化キーは環境変数で管理することを強く推奨します

UPDATE employees
SET api_key_encrypted = pgp_sym_encrypt(api_key, current_setting('app.encryption_key'))
WHERE api_key IS NOT NULL;

RAISE NOTICE '✅ 既存のAPIキーを暗号化しました';

-- ==========================================
-- STEP 4: 元のapi_keyカラムをクリア（オプション）
-- ==========================================

-- ⚠️ 暗号化が正常に動作することを確認してから実行してください

-- UPDATE employees SET api_key = NULL;
-- RAISE NOTICE '✅ 元のapi_keyカラムをクリアしました';

-- ==========================================
-- STEP 5: 復号化関数の作成
-- ==========================================

CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_key, current_setting('app.encryption_key'));
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✅ API キー復号化関数を作成しました';

-- ==========================================
-- STEP 6: 暗号化/復号化のテスト
-- ==========================================

DO $$
DECLARE
  test_key TEXT := 'sk-ant-api03-test1234567890';
  encrypted BYTEA;
  decrypted TEXT;
BEGIN
  -- 暗号化テスト
  encrypted := pgp_sym_encrypt(test_key, current_setting('app.encryption_key'));

  -- 復号化テスト
  decrypted := decrypt_api_key(encrypted);

  IF decrypted = test_key THEN
    RAISE NOTICE '✅ 暗号化/復号化テスト成功';
  ELSE
    RAISE WARNING '❌ 暗号化/復号化テスト失敗';
  END IF;
END $$;

-- ==========================================
-- STEP 7: 完了確認
-- ==========================================

SELECT
  COUNT(*) AS total_employees,
  COUNT(api_key) AS api_key_count,
  COUNT(api_key_encrypted) AS encrypted_count
FROM employees;

RAISE NOTICE '========================================';
RAISE NOTICE '✅ APIキー暗号化マイグレーションが完了しました';
RAISE NOTICE '次のステップ: アプリケーションコードを更新して暗号化されたキーを使用してください';
RAISE NOTICE '========================================';
```

3. **環境変数の設定**

Supabase Dashboard → Project Settings → API Settings → Custom Postgres Configuration

```
app.encryption_key = 'your-strong-encryption-key-here'
```

⚠️ 暗号化キーは32文字以上の強力なランダム文字列を使用してください

4. **アプリケーションコードの更新**

`pages/index.js`の社員追加機能を更新:

```javascript
// 社員追加時にAPIキーを暗号化して保存
const { data, error } = await supabase.rpc('add_employee_with_encrypted_key', {
  p_email: email,
  p_name: name,
  p_api_key: apiKey // RPC関数内で暗号化
})
```

対応するSQL関数:

```sql
CREATE OR REPLACE FUNCTION add_employee_with_encrypted_key(
  p_email TEXT,
  p_name TEXT,
  p_api_key TEXT
)
RETURNS TABLE(id INTEGER, name TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO employees (email, name, api_key_encrypted, added_by, created_at)
  VALUES (
    p_email,
    p_name,
    pgp_sym_encrypt(p_api_key, current_setting('app.encryption_key')),
    auth.uid()::TEXT,
    now()
  )
  RETURNING employees.id, employees.name, employees.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### ステップ2.3: Phase 2完了確認（0.5時間）

#### Phase 2 完了チェックリスト

- [ ] チーム別RLSポリシーが全テーブルに設定されている
- [ ] LBチームでログインしてLBデータのみ表示されることを確認
- [ ] GRチームに切り替えてGRデータのみ表示されることを確認
- [ ] 管理者で全社監査ビューが機能することを確認
- [ ] pgcryptoエクステンションが有効化されている
- [ ] APIキーが暗号化されてapi_key_encryptedカラムに保存されている
- [ ] 復号化関数decrypt_api_keyが正常に動作する

---

## 🎨 Phase 3: コード品質向上（2日）

**目標**: コードの一貫性を高め、エラーハンドリングを強化する

### ステップ3.1: alert()の完全排除（1時間）

#### 実行内容

`pages/index.js`の以下の行を修正:

```javascript
// 1249行目
- alert('ToDoリストが空です')
+ showToast('ToDoリストが空です', 'info')

// 1252行目
- alert('Supabase保存中にエラーが発生しました')
+ showToast('Supabase保存中にエラーが発生しました', 'error')

// 1254行目
- alert('エラーの詳細: ' + saveError.message)
+ showToast('エラーの詳細: ' + saveError.message, 'error')

// 2880行目（全社監査ビュー関連）
- alert('データ読み込みエラー')
+ showToast('データ読み込みエラー', 'error')
```

#### 確認方法

Grep検索で残存するalert()を確認:

```bash
grep -n "alert(" pages/index.js
```

結果が0件であることを確認。

---

### ステップ3.2: エラーハンドリング強化（2時間）

#### 実行内容

`saveTasksToSupabase`関数のエラーハンドリング改善:

```javascript
// 修正前（1208行目付近）
if (insertError) {
  console.error('🚨 Tasks挿入エラー:', insertError)
  console.error('⚠️ タスクが削除されたまま保存に失敗しました')
}

// 修正後
if (insertError) {
  console.error('🚨 Tasks挿入エラー:', insertError)

  // ロールバック: 削除前のタスクを復元
  const { error: rollbackError } = await supabase
    .from('tasks')
    .insert(existingTasks.map(task => ({
      ...task,
      team_id: selectedTeam
    })))

  if (rollbackError) {
    console.error('🚨 ロールバック失敗:', rollbackError)
    showToast('データ保存に失敗しました。ページを再読み込みしてください。', 'error')
  } else {
    console.log('✅ ロールバック成功: 削除前の状態に復元しました')
    showToast('データ保存に失敗しましたが、元の状態に復元しました', 'warning')
  }

  return // 処理を中断
}
```

---

### ステップ3.3: カスタム認証テーブルの整理（1時間）

#### 調査

1. `custom_users`テーブルの使用状況を確認

```sql
-- custom_usersテーブルの参照回数を確認
SELECT COUNT(*) FROM custom_users;

-- アプリケーションコードでの使用状況を確認
-- pages/index.js で "custom_users" を検索
```

2. 使用されていない場合は削除を検討

```sql
-- custom_usersテーブルのバックアップ
CREATE TABLE custom_users_backup_20251018 AS SELECT * FROM custom_users;

-- custom_usersテーブルの削除
DROP TABLE IF EXISTS custom_users CASCADE;

RAISE NOTICE '✅ custom_usersテーブルを削除しました（バックアップ: custom_users_backup_20251018）';
```

3. 使用されている場合は役割を明確化

ドキュメント化:
- `custom_users`テーブルの用途
- Supabase Authとの関係
- データ同期方法

---

### ステップ3.4: Phase 3完了確認（0.5時間）

#### Phase 3 完了チェックリスト

- [ ] alert()が完全に排除されている（grep検索で0件）
- [ ] saveTasksToSupabase関数にロールバック処理が実装されている
- [ ] エラーハンドリングが強化されている
- [ ] custom_usersテーブルの役割が明確化されている
- [ ] コードレビューを実施し、一貫性を確認

---

## 📊 全体完了確認

### 最終確認SQL

```sql
-- ==========================================
-- Phase 1-3 全体完了確認SQL
-- ==========================================

-- 1. テーブル存在確認
SELECT
  '✅ テーブル存在確認' AS check_item,
  COUNT(*) || '/10個のテーブルが存在' AS result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tasks', 'user_profiles', 'team_numbers', 'employees', 'custom_users',
    'completed_reports', 'patrol_checklists', 'admin_users',
    'kaizen_plans', 'ai_consultations'
  );

-- 2. データ型統一確認
SELECT
  '✅ データ型統一確認' AS check_item,
  CASE
    WHEN COUNT(DISTINCT data_type) = 1 AND MIN(data_type) = 'uuid' THEN '全テーブルでUUID型に統一'
    ELSE '⚠️ 型不一致あり'
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN ('tasks', 'user_profiles', 'completed_reports', 'patrol_checklists', 'kaizen_plans', 'ai_consultations');

-- 3. RLS有効化確認
SELECT
  '✅ RLS有効化確認' AS check_item,
  COUNT(*) || '/10個のテーブルでRLS有効' AS result
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN (
    'tasks', 'user_profiles', 'team_numbers', 'employees', 'custom_users',
    'completed_reports', 'patrol_checklists', 'admin_users',
    'kaizen_plans', 'ai_consultations'
  );

-- 4. チーム別RLSポリシー確認
SELECT
  '✅ チーム別RLSポリシー確認' AS check_item,
  COUNT(*) || '個のチーム別ポリシーが設定' AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'team_based_%';

-- 5. pgcrypto有効化確認
SELECT
  '✅ pgcrypto確認' AS check_item,
  CASE
    WHEN COUNT(*) > 0 THEN 'pgcryptoエクステンション有効'
    ELSE '⚠️ pgcryptoエクステンション未有効'
  END AS result
FROM pg_extension
WHERE extname = 'pgcrypto';

-- 6. APIキー暗号化確認
SELECT
  '✅ APIキー暗号化確認' AS check_item,
  COUNT(*) || '件のAPIキーが暗号化' AS result
FROM employees
WHERE api_key_encrypted IS NOT NULL;

-- ==========================================
-- 最終結果
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Phase 1-3 全体完了確認';
  RAISE NOTICE '========================================';
  RAISE NOTICE '次のステップ: アプリケーション全体の動作確認とユーザー受け入れテストを実施してください';
END $$;
```

### 最終チェックリスト

#### データベース
- [ ] 全10テーブルが存在
- [ ] user_id型がUUIDに統一
- [ ] team_id型がTEXTに統一
- [ ] 全テーブルでRLS有効
- [ ] チーム別RLSポリシー実装
- [ ] pgcrypto有効化
- [ ] APIキー暗号化実装

#### アプリケーション
- [ ] ログイン機能正常動作
- [ ] チーム選択機能正常動作
- [ ] ToDoリスト正常動作
- [ ] 報告書作成正常動作
- [ ] パトロールチェックシート正常動作
- [ ] AI相談機能正常動作
- [ ] 全社監査ビュー正常動作（管理者のみ）
- [ ] チーム別データ分離確認
- [ ] alert()完全排除
- [ ] エラーハンドリング強化

#### セキュリティ
- [ ] 未認証ユーザーのアクセス拒否
- [ ] チーム間データ分離確認
- [ ] 管理者権限の動作確認
- [ ] APIキー暗号化確認
- [ ] SQLインジェクション対策確認（Supabase標準）
- [ ] XSS対策確認（React標準）

#### パフォーマンス
- [ ] ページ読み込み速度確認
- [ ] データ保存速度確認
- [ ] 大量データ時の動作確認

#### ドキュメント
- [ ] 実装手順書作成（本ドキュメント）
- [ ] 詳細分析レポート作成
- [ ] 記憶媒体への保管完了

---

## 📝 補足情報

### トラブルシューティング

#### 問題1: RLSポリシーでデータが表示されない

**原因**: user_metadata.last_team_id が設定されていない

**解決策**:
```sql
-- ユーザーのuser_metadataを確認
SELECT id, email, user_metadata
FROM auth.users
WHERE id = 'YOUR_USER_ID';

-- last_team_idを手動設定
UPDATE auth.users
SET user_metadata = user_metadata || '{"last_team_id": "LB"}'::jsonb
WHERE id = 'YOUR_USER_ID';
```

#### 問題2: APIキー暗号化でエラー

**原因**: encryption_keyが設定されていない

**解決策**:
```sql
-- セッション内で一時的に設定
SET app.encryption_key = 'your-encryption-key';

-- 永続的に設定（Supabase Dashboard → Project Settings → Custom Postgres Configuration）
```

#### 問題3: データ型変更でエラー

**原因**: 既存データがUUID形式でない

**解決策**:
```sql
-- データを確認
SELECT user_id, pg_typeof(user_id) FROM tasks LIMIT 10;

-- NULLまたは無効なデータを修正してから再実行
```

---

## 🎯 次のステップ

Phase 1-3完了後の推奨作業:

1. **ユーザー受け入れテスト**
   - 各チームの代表者にテスト依頼
   - フィードバック収集

2. **本番環境デプロイ**
   - Vercelへのデプロイ
   - 環境変数設定
   - Supabase本番設定

3. **運用監視設定**
   - エラーログ監視
   - パフォーマンス監視
   - データベース使用量監視

4. **ドキュメント整備**
   - ユーザーマニュアル作成
   - 管理者マニュアル作成
   - 障害対応手順書作成

---

**作成者**: Claude Code Assistant
**最終更新**: 2025-10-18
