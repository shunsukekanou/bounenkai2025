-- report_number フィールドを INTEGER から TEXT に変更
-- 改善ナンバーフォーマット: {team_id}-{YYMM}-{4桁連番}

-- 既存データをバックアップ（念のため）
-- SELECT * FROM completed_reports;

-- report_number を TEXT 型に変更
ALTER TABLE completed_reports
ALTER COLUMN report_number TYPE TEXT;

-- 既存の数値データをクリア（新しいフォーマットに対応させるため）
UPDATE completed_reports
SET report_number = NULL;

-- 実行完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ report_number を TEXT 型に変更しました';
  RAISE NOTICE '📊 既存の数値データはクリアされました';
  RAISE NOTICE '🎯 新しいフォーマット: {team_id}-{YYMM}-{4桁連番}';
END $$;
