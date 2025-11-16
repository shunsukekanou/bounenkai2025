-- リーチ状態を保存するカラムを追加
-- Supabase Dashboard > SQL Editor で実行

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS is_reach BOOLEAN DEFAULT false;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_participants_is_reach ON participants(is_reach);

-- 確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'participants';
