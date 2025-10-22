-- MKG-app 不足テーブル作成SQL
-- 実行方法: Supabase Dashboard → SQL Editor でこのSQLを実行

-- tasks テーブル作成・拡張
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  teamId TEXT, -- 既存との互換性用
  team_id INTEGER, -- 新しい形式
  user_id INTEGER,
  startDate DATE,
  endDate DATE, -- 不足していた列
  kaizenData JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- user_profiles テーブル作成（既存システム互換性用）
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  selected_team TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS 有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定
DROP POLICY IF EXISTS "Users can manage all tasks" ON tasks;
CREATE POLICY "Users can manage all tasks"
ON tasks
FOR ALL
USING (true);

DROP POLICY IF EXISTS "Users can manage all profiles" ON user_profiles;
CREATE POLICY "Users can manage all profiles"
ON user_profiles
FOR ALL
USING (true);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- コメント
COMMENT ON TABLE tasks IS 'MKG-app タスク管理テーブル';
COMMENT ON TABLE user_profiles IS 'MKG-app ユーザープロファイルテーブル（互換性用）';
COMMENT ON COLUMN tasks.endDate IS '終了日（不足していた必須列）';
COMMENT ON COLUMN tasks.kaizenData IS 'カイゼン関連データ（JSON形式）';