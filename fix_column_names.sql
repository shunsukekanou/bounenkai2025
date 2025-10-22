-- tasks テーブルのカラム名をsnake_caseに修正
-- 実行方法: Supabase Dashboard → SQL Editor でこのSQLを実行

-- カラム名変更（CamelCase → snake_case）
ALTER TABLE tasks RENAME COLUMN "startDate" TO start_date;
ALTER TABLE tasks RENAME COLUMN "endDate" TO end_date;
ALTER TABLE tasks RENAME COLUMN "teamId" TO teamid;
ALTER TABLE tasks RENAME COLUMN "kaizenData" TO kaizen_data;

-- 変更完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ tasksテーブルのカラム名をsnake_caseに修正完了';
  RAISE NOTICE '📊 修正内容:';
  RAISE NOTICE '  - startDate → start_date';
  RAISE NOTICE '  - endDate → end_date';
  RAISE NOTICE '  - teamId → teamid';
  RAISE NOTICE '  - kaizenData → kaizen_data';
END $$;