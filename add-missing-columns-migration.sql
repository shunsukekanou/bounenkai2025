-- 忘年会ビンゴアプリ - 欠落カラム追加マイグレーション
-- 実行方法: Supabase Dashboard > SQL Editor > 新しいクエリ > このSQLを貼り付けて実行
-- 作成日: 2025-12-06

-- ========================================
-- participantsテーブルに欠落しているカラムを追加
-- ========================================

-- 1. bingo_cardカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'bingo_card'
  ) THEN
    ALTER TABLE participants ADD COLUMN bingo_card JSONB;
  END IF;
END $$;

-- 2. is_reachカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'is_reach'
  ) THEN
    ALTER TABLE participants ADD COLUMN is_reach BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ========================================
-- マイグレーション完了
-- ========================================
-- このSQLを実行後、以下を確認してください：
-- 1. participants テーブルに bingo_card (JSONB型) カラムが追加されている
-- 2. participants テーブルに is_reach (BOOLEAN型) カラムが追加されている
-- 3. アプリケーションでビンゴカード選択が正常に動作する
