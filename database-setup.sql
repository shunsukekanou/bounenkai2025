-- 忘年会ビンゴアプリ - Supabaseデータベースセットアップ
-- 実行方法: Supabase Dashboard > SQL Editor > 新しいクエリ > このSQLを貼り付けて実行

-- ========================================
-- 1. gamesテーブル作成
-- ========================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_code TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'finished')) DEFAULT 'active',
  drawn_numbers INTEGER[] DEFAULT '{}'
);

-- ========================================
-- 2. participantsテーブル作成
-- ========================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  bingo_card JSONB,
  is_reach BOOLEAN DEFAULT false,
  bingo_rank INTEGER
);

-- ========================================
-- 3. インデックス作成（パフォーマンス向上）
-- ========================================
CREATE INDEX IF NOT EXISTS idx_games_game_code ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_participants_game_id ON participants(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_bingo_rank ON participants(bingo_rank);

-- ========================================
-- 4. Row Level Security (RLS) 設定
-- ========================================
-- 全てのユーザーが読み取り可能（匿名ユーザー含む）
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- gamesテーブル: 誰でも読み取り・作成可能
CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update games"
  ON games FOR UPDATE
  USING (true);

-- participantsテーブル: 誰でも読み取り・作成・更新可能
CREATE POLICY "Anyone can read participants"
  ON participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create participants"
  ON participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update participants"
  ON participants FOR UPDATE
  USING (true);

-- ========================================
-- 5. Realtime有効化（リアルタイム同期用）
-- ========================================
-- Supabase Realtime機能を有効化
-- Dashboard > Database > Publications で確認・有効化も可能

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- ========================================
-- 6. テスト用データ（オプション）
-- ========================================
-- 開発テスト用のサンプルゲームを作成
-- INSERT INTO games (game_code, status, drawn_numbers)
-- VALUES ('TEST01', 'active', ARRAY[1, 5, 10, 15, 20]);

-- ========================================
-- セットアップ完了
-- ========================================
-- このSQLを実行後、以下を確認してください：
-- 1. Tables: games, participants が作成されている
-- 2. RLS Policies: 各テーブルに3つずつポリシーがある
-- 3. Realtime: Publications に games, participants が追加されている
