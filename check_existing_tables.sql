-- ==========================================
-- 既存テーブル構造確認SQL
-- 目的: エラー原因の特定
-- ==========================================

-- 1. 既存のテーブル一覧を確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. completed_reportsテーブルが既に存在するか確認
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'completed_reports'
) AS completed_reports_exists;

-- 3. completed_reportsテーブルの構造を確認（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'completed_reports'
ORDER BY ordinal_position;

-- 4. patrol_checklistsテーブルの構造を確認（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patrol_checklists'
ORDER BY ordinal_position;

-- 5. admin_usersテーブルの構造を確認（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- 6. kaizen_plansテーブルの構造を確認（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'kaizen_plans'
ORDER BY ordinal_position;

-- 7. ai_consultationsテーブルの構造を確認（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_consultations'
ORDER BY ordinal_position;
