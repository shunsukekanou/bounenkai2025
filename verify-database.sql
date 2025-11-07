-- データベース構成確認用SQL
-- Supabase Dashboard > SQL Editor で実行してください

-- ========================================
-- テーブル存在確認
-- ========================================
SELECT
  table_name,
  CASE
    WHEN table_name IN ('games', 'participants') THEN '✅ 存在'
    ELSE '❌ 未作成'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('games', 'participants')
ORDER BY table_name;

-- ========================================
-- gamesテーブルのカラム確認
-- ========================================
SELECT
  '--- gamesテーブルのカラム ---' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'games'
ORDER BY ordinal_position;

-- ========================================
-- participantsテーブルのカラム確認
-- ========================================
SELECT
  '--- participantsテーブルのカラム ---' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'participants'
ORDER BY ordinal_position;

-- ========================================
-- RLSポリシー確認
-- ========================================
SELECT
  '--- RLSポリシー確認 ---' as info;

SELECT
  tablename,
  policyname,
  CASE
    WHEN cmd = 'SELECT' THEN '読取'
    WHEN cmd = 'INSERT' THEN '作成'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '削除'
    ELSE cmd
  END as 操作種類
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('games', 'participants')
ORDER BY tablename, policyname;

-- ========================================
-- インデックス確認
-- ========================================
SELECT
  '--- インデックス確認 ---' as info;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('games', 'participants')
  AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;

-- ========================================
-- 期待される結果
-- ========================================
-- 1. テーブル存在確認: games, participants が「✅ 存在」
-- 2. gamesカラム: id, created_at, game_code, status, drawn_numbers
-- 3. participantsカラム: id, created_at, game_id, user_name, bingo_rank
-- 4. RLSポリシー: 各テーブルに3つずつ（読取、作成、更新）
-- 5. インデックス: idx_games_game_code, idx_participants_game_id, idx_participants_bingo_rank
