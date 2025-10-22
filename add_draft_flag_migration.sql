-- 活動報告書の下書き機能実装
-- 目的: 一次保存機能をSupabaseに実装し、PC依存をゼロに

-- ==========================================
-- completed_reportsテーブルにis_draftカラムを追加
-- ==========================================

-- is_draftカラムを追加（デフォルト: false = 完成版）
ALTER TABLE completed_reports
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- 既存のデータはすべて完成版として扱う
UPDATE completed_reports
SET is_draft = false
WHERE is_draft IS NULL;

-- ==========================================
-- インデックス追加（パフォーマンス最適化）
-- ==========================================

-- チーム別 + 下書きフラグでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_completed_reports_team_draft
ON completed_reports(team_id, is_draft);

-- ==========================================
-- 確認
-- ==========================================

-- テーブル構造を確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'completed_reports'
ORDER BY ordinal_position;

-- カウント確認
SELECT
  is_draft,
  COUNT(*) as count
FROM completed_reports
GROUP BY is_draft;

-- ==========================================
-- 完了メッセージ
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 下書き機能マイグレーション完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 追加内容:';
  RAISE NOTICE '  - is_draft BOOLEAN カラム追加';
  RAISE NOTICE '  - デフォルト値: false（完成版）';
  RAISE NOTICE '  - インデックス追加: team_id + is_draft';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 これで以下が可能に:';
  RAISE NOTICE '  1. 一次保存 → is_draft = true';
  RAISE NOTICE '  2. 本保存 → is_draft = false + 改善№付与';
  RAISE NOTICE '  3. 下書き一覧の表示';
  RAISE NOTICE '  4. PCやデバイス間でデータ共有';
  RAISE NOTICE '========================================';
END $$;
