-- completed_reports テーブルに report_number 列を追加
-- 🎯 改善ナンバー管理システム実装

-- report_number 列を追加（チーム内連番）
ALTER TABLE completed_reports
ADD COLUMN IF NOT EXISTS report_number INTEGER;

-- インデックス作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_completed_reports_team_id
ON completed_reports(team_id);

CREATE INDEX IF NOT EXISTS idx_completed_reports_report_number
ON completed_reports(team_id, report_number);

-- コメント追加
COMMENT ON COLUMN completed_reports.report_number IS 'チーム内での報告書連番（保存時に自動付与）';

-- 既存データに連番を適用する関数
CREATE OR REPLACE FUNCTION migrate_existing_report_numbers()
RETURNS TABLE(team_id TEXT, updated_count INTEGER) AS $$
DECLARE
  team_record RECORD;
  report_record RECORD;
  current_number INTEGER;
BEGIN
  -- 全チームをループ
  FOR team_record IN
    SELECT DISTINCT cr.team_id
    FROM completed_reports cr
    WHERE cr.report_number IS NULL
    ORDER BY cr.team_id
  LOOP
    current_number := 1;

    -- 各チームの報告書を作成日順にループ
    FOR report_record IN
      SELECT id
      FROM completed_reports
      WHERE completed_reports.team_id = team_record.team_id
        AND report_number IS NULL
      ORDER BY created_at ASC
    LOOP
      -- 連番を付与
      UPDATE completed_reports
      SET report_number = current_number
      WHERE id = report_record.id;

      current_number := current_number + 1;
    END LOOP;

    -- 結果を返す
    team_id := team_record.team_id;
    updated_count := current_number - 1;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 実行完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ report_number 列の追加完了';
  RAISE NOTICE '📊 既存データに連番を適用する場合は以下を実行:';
  RAISE NOTICE '   SELECT * FROM migrate_existing_report_numbers();';
END $$;
