-- ==========================================
-- 既存テーブル修正SQL（テーブルが既に存在する場合）
-- 作成日: 2025-10-18
-- 目的: 既存テーブルにuser_id列を追加
-- ==========================================

-- ⚠️ 注意: このSQLは既存テーブルが存在する場合のみ実行してください

-- 1. completed_reportsテーブルにuser_id列を追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'completed_reports'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE completed_reports
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ completed_reports.user_id 列を追加しました';
  ELSE
    RAISE NOTICE 'ℹ️  completed_reports.user_id 列は既に存在します';
  END IF;
END $$;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_completed_reports_user_id ON completed_reports(user_id);

-- 2. patrol_checklistsテーブルにuser_id列を追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patrol_checklists'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE patrol_checklists
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ patrol_checklists.user_id 列を追加しました';
  ELSE
    RAISE NOTICE 'ℹ️  patrol_checklists.user_id 列は既に存在します';
  END IF;
END $$;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_user_id ON patrol_checklists(user_id);

-- 3. kaizen_plansテーブルにuser_id列を追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'kaizen_plans'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE kaizen_plans
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ kaizen_plans.user_id 列を追加しました';
  ELSE
    RAISE NOTICE 'ℹ️  kaizen_plans.user_id 列は既に存在します';
  END IF;
END $$;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_user_id ON kaizen_plans(user_id);

-- 4. ai_consultationsテーブルにuser_id列を追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ai_consultations'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE ai_consultations
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ ai_consultations.user_id 列を追加しました';
  ELSE
    RAISE NOTICE 'ℹ️  ai_consultations.user_id 列は既に存在します';
  END IF;
END $$;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_ai_consultations_user_id ON ai_consultations(user_id);

-- 5. RLS有効化
ALTER TABLE completed_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaizen_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー作成（既に存在する場合はスキップ）
DO $$
BEGIN
  -- completed_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'completed_reports' AND policyname = 'completed_reports_auth_select'
  ) THEN
    EXECUTE 'CREATE POLICY "completed_reports_auth_select" ON completed_reports FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE '✅ completed_reports RLSポリシーを作成しました';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'completed_reports' AND policyname = 'completed_reports_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "completed_reports_auth_insert" ON completed_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'completed_reports' AND policyname = 'completed_reports_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY "completed_reports_auth_update" ON completed_reports FOR UPDATE USING (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'completed_reports' AND policyname = 'completed_reports_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "completed_reports_auth_delete" ON completed_reports FOR DELETE USING (auth.uid() IS NOT NULL)';
  END IF;

  -- patrol_checklists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_checklists' AND policyname = 'patrol_checklists_auth_select'
  ) THEN
    EXECUTE 'CREATE POLICY "patrol_checklists_auth_select" ON patrol_checklists FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE '✅ patrol_checklists RLSポリシーを作成しました';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_checklists' AND policyname = 'patrol_checklists_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "patrol_checklists_auth_insert" ON patrol_checklists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_checklists' AND policyname = 'patrol_checklists_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY "patrol_checklists_auth_update" ON patrol_checklists FOR UPDATE USING (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patrol_checklists' AND policyname = 'patrol_checklists_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "patrol_checklists_auth_delete" ON patrol_checklists FOR DELETE USING (auth.uid() IS NOT NULL)';
  END IF;

  -- admin_users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_users' AND policyname = 'admin_users_select'
  ) THEN
    EXECUTE 'CREATE POLICY "admin_users_select" ON admin_users FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE '✅ admin_users RLSポリシーを作成しました';
  END IF;

  -- kaizen_plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kaizen_plans' AND policyname = 'kaizen_plans_auth_select'
  ) THEN
    EXECUTE 'CREATE POLICY "kaizen_plans_auth_select" ON kaizen_plans FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE '✅ kaizen_plans RLSポリシーを作成しました';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kaizen_plans' AND policyname = 'kaizen_plans_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "kaizen_plans_auth_insert" ON kaizen_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kaizen_plans' AND policyname = 'kaizen_plans_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY "kaizen_plans_auth_update" ON kaizen_plans FOR UPDATE USING (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kaizen_plans' AND policyname = 'kaizen_plans_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "kaizen_plans_auth_delete" ON kaizen_plans FOR DELETE USING (auth.uid() IS NOT NULL)';
  END IF;

  -- ai_consultations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_consultations' AND policyname = 'ai_consultations_auth_select'
  ) THEN
    EXECUTE 'CREATE POLICY "ai_consultations_auth_select" ON ai_consultations FOR SELECT USING (auth.uid() IS NOT NULL)';
    RAISE NOTICE '✅ ai_consultations RLSポリシーを作成しました';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_consultations' AND policyname = 'ai_consultations_auth_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "ai_consultations_auth_insert" ON ai_consultations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_consultations' AND policyname = 'ai_consultations_auth_update'
  ) THEN
    EXECUTE 'CREATE POLICY "ai_consultations_auth_update" ON ai_consultations FOR UPDATE USING (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_consultations' AND policyname = 'ai_consultations_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "ai_consultations_auth_delete" ON ai_consultations FOR DELETE USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 既存テーブルの修正が完了しました';
  RAISE NOTICE '========================================';
END $$;
