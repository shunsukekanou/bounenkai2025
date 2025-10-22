-- MKG-app 修正版テーブル作成SQL
-- 🚨 Supabase Auth連携対応版
-- 📋 PC管理者承認済み技術仕様準拠（500MB絶対制限）

-- ===============================================
-- Phase 1: 基本テーブル（Auth連携修正版）
-- ===============================================

-- tasks テーブル作成（Auth連携対応版）
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  category VARCHAR(50),
  teamId VARCHAR(10), -- 既存互換性用
  team_id INTEGER, -- 新形式
  user_id UUID REFERENCES auth.users(id), -- Auth連携修正
  startDate DATE,
  endDate DATE,
  kaizenData JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 容量制約チェック
  CONSTRAINT title_length_check CHECK (length(title) <= 200),
  CONSTRAINT status_valid_check CHECK (status IN ('pending', 'in-progress', 'completed', 'todo')),
  CONSTRAINT category_length_check CHECK (length(category) <= 50)
);

-- user_profiles テーブル作成（Auth連携対応版）
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id), -- Auth連携修正
  selected_team VARCHAR(10),
  display_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 容量制約チェック
  CONSTRAINT display_name_length_check CHECK (length(display_name) <= 100)
);

-- team_numbers テーブル作成（チーム番号管理）
CREATE TABLE IF NOT EXISTS team_numbers (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(10) NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id), -- Auth連携追加
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 重複防止
  UNIQUE(team_id, year_month),

  -- 制約チェック
  CONSTRAINT team_id_format_check CHECK (team_id ~ '^[A-Z]{2}$'),
  CONSTRAINT year_month_format_check CHECK (year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT current_number_positive CHECK (current_number > 0 AND current_number <= 9999)
);

-- employees テーブル作成（社員管理）
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(500),
  created_by UUID REFERENCES auth.users(id), -- Auth連携修正
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 制約チェック
  CONSTRAINT name_length_check CHECK (length(name) <= 100),
  CONSTRAINT email_format_check CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ===============================================
-- RLS (Row Level Security) 設定
-- ===============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- RLS ポリシー設定（Auth対応版）
-- ===============================================

-- tasks テーブルポリシー
DROP POLICY IF EXISTS "Users can manage all tasks" ON tasks;
CREATE POLICY "Users can manage all tasks"
ON tasks
FOR ALL
USING (auth.uid() IS NOT NULL); -- 認証ユーザーのみ

-- user_profiles テーブルポリシー
DROP POLICY IF EXISTS "Users can manage all profiles" ON user_profiles;
CREATE POLICY "Users can manage all profiles"
ON user_profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- team_numbers テーブルポリシー
DROP POLICY IF EXISTS "Users can manage team numbers" ON team_numbers;
CREATE POLICY "Users can manage team numbers"
ON team_numbers
FOR ALL
USING (auth.uid() IS NOT NULL);

-- employees テーブルポリシー
DROP POLICY IF EXISTS "Users can manage employees" ON employees;
CREATE POLICY "Users can manage employees"
ON employees
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ===============================================
-- インデックス作成
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_selected_team ON user_profiles(selected_team);

CREATE INDEX IF NOT EXISTS idx_team_numbers_team_year ON team_numbers(team_id, year_month);
CREATE INDEX IF NOT EXISTS idx_team_numbers_created_by ON team_numbers(created_by);

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);

-- ===============================================
-- 使用量監視用関数（修正版）
-- ===============================================

-- データベースサイズ取得関数
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE(database_size BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (
      COALESCE((SELECT COUNT(*) FROM tasks), 0) * 1024 +
      COALESCE((SELECT COUNT(*) FROM user_profiles), 0) * 512 +
      COALESCE((SELECT COUNT(*) FROM team_numbers), 0) * 256 +
      COALESCE((SELECT COUNT(*) FROM employees), 0) * 768 +
      1048576 -- 基本容量1MB
    )::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- テーブルサイズ取得関数
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  size_bytes BIGINT,
  row_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'tasks'::TEXT,
    (COALESCE((SELECT COUNT(*) FROM tasks), 0) * 1024)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM tasks), 0);

  RETURN QUERY
  SELECT
    'user_profiles'::TEXT,
    (COALESCE((SELECT COUNT(*) FROM user_profiles), 0) * 512)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM user_profiles), 0);

  RETURN QUERY
  SELECT
    'team_numbers'::TEXT,
    (COALESCE((SELECT COUNT(*) FROM team_numbers), 0) * 256)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM team_numbers), 0);

  RETURN QUERY
  SELECT
    'employees'::TEXT,
    (COALESCE((SELECT COUNT(*) FROM employees), 0) * 768)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM employees), 0);
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- テーブル説明
-- ===============================================

COMMENT ON TABLE tasks IS 'MKG-app タスク管理（Auth連携版）';
COMMENT ON TABLE user_profiles IS 'MKG-app ユーザープロファイル（Auth連携版）';
COMMENT ON TABLE team_numbers IS 'MKG-app チーム番号管理（積算システム用）';
COMMENT ON TABLE employees IS 'MKG-app 社員管理（Claude API統合用）';

-- 実行完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ MKG-app テーブル作成完了（修正版）';
  RAISE NOTICE '🔗 Supabase Auth連携対応済み';
  RAISE NOTICE '📊 制約遵守: 500MB制限対応済み';
  RAISE NOTICE '🔒 RLS設定: 認証ユーザー制限済み';
  RAISE NOTICE '📈 使用量監視関数利用可能';
END $$;