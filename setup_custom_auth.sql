-- MKG-app カスタム認証システム用テーブル作成
-- 実行方法: Supabase Dashboard → SQL Editor でこのSQLを実行

-- custom_users テーブル作成
CREATE TABLE IF NOT EXISTS custom_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  teams TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS (Row Level Security) 有効化
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー設定（既存ポリシーがある場合は削除してから作成）
DROP POLICY IF EXISTS "Users can read all user data" ON custom_users;
CREATE POLICY "Users can read all user data"
ON custom_users
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert new user data" ON custom_users;
CREATE POLICY "Users can insert new user data"
ON custom_users
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own data" ON custom_users;
CREATE POLICY "Users can update their own data"
ON custom_users
FOR UPDATE
USING (true);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_custom_users_username ON custom_users(username);
CREATE INDEX IF NOT EXISTS idx_custom_users_password_hash ON custom_users(password_hash);

-- テスト用サンプルデータ（オプション）
-- INSERT INTO custom_users (username, password_hash, display_name, teams)
-- VALUES ('test', encode(digest('testpass' || 'mkg-salt-2024', 'sha256'), 'base64'), 'テストユーザー', ARRAY['チーム1']);

COMMENT ON TABLE custom_users IS 'MKG-app カスタム認証システム用ユーザーテーブル';
COMMENT ON COLUMN custom_users.username IS 'ユーザー名（英数字、一意）';
COMMENT ON COLUMN custom_users.password_hash IS 'ハッシュ化されたパスワード';
COMMENT ON COLUMN custom_users.display_name IS '表示名';
COMMENT ON COLUMN custom_users.teams IS '所属チーム配列';