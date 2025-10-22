-- ==========================================
-- MKG-app 欠落テーブル定義
-- 作成日: 2025-10-18
-- 目的: completed_reports, patrol_checklists, admin_users, kaizen_plans, ai_consultations の完全定義
-- ==========================================

-- 1. completed_reports テーブル（活動報告書）
CREATE TABLE IF NOT EXISTS completed_reports (
  id SERIAL PRIMARY KEY,
  task_id INTEGER,
  title TEXT NOT NULL,
  report_number TEXT, -- チーム別改善ナンバー（例: LB-2510-0001）
  report_data JSONB NOT NULL,
  team_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_draft BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_completed_reports_team_id ON completed_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_completed_reports_user_id ON completed_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_reports_is_draft ON completed_reports(is_draft);
CREATE INDEX IF NOT EXISTS idx_completed_reports_report_number ON completed_reports(report_number);

-- RLS有効化
ALTER TABLE completed_reports ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "completed_reports_auth_select" ON completed_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_insert" ON completed_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_update" ON completed_reports
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "completed_reports_auth_delete" ON completed_reports
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 2. patrol_checklists テーブル（パトロールチェックシート）
CREATE TABLE IF NOT EXISTS patrol_checklists (
  id BIGINT PRIMARY KEY,
  basic_info JSONB NOT NULL,
  evaluations JSONB NOT NULL,
  comments JSONB NOT NULL,
  iso_items JSONB,
  total_score INTEGER DEFAULT 0,
  score_counts JSONB DEFAULT '{}',
  score_difference INTEGER DEFAULT 0,
  last_score INTEGER,
  previous_score INTEGER,
  team_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_team_id ON patrol_checklists(team_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_user_id ON patrol_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_patrol_checklists_saved_at ON patrol_checklists(saved_at);

-- RLS有効化
ALTER TABLE patrol_checklists ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "patrol_checklists_auth_select" ON patrol_checklists
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_insert" ON patrol_checklists
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_update" ON patrol_checklists
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "patrol_checklists_auth_delete" ON patrol_checklists
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 3. admin_users テーブル（管理者ユーザー管理）
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- RLS有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全認証ユーザーが閲覧可能、挿入・更新・削除は管理者のみ）
CREATE POLICY "admin_users_select" ON admin_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_users_insert" ON admin_users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "admin_users_update" ON admin_users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "admin_users_delete" ON admin_users
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE username = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ==========================================

-- 4. kaizen_plans テーブル（カイゼン計画）
CREATE TABLE IF NOT EXISTS kaizen_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  current_problem TEXT,
  target_goal TEXT,
  team_id TEXT NOT NULL,
  kaizen_number TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_team_id ON kaizen_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_user_id ON kaizen_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_kaizen_plans_kaizen_number ON kaizen_plans(kaizen_number);

-- RLS有効化
ALTER TABLE kaizen_plans ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "kaizen_plans_auth_select" ON kaizen_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_insert" ON kaizen_plans
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_update" ON kaizen_plans
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "kaizen_plans_auth_delete" ON kaizen_plans
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ==========================================

-- 5. ai_consultations テーブル（AI相談履歴）
CREATE TABLE IF NOT EXISTS ai_consultations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ai_consultations_user_id ON ai_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_team_id ON ai_consultations(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_created_at ON ai_consultations(created_at);

-- RLS有効化
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Phase 2で詳細設定）
CREATE POLICY "ai_consultations_auth_select" ON ai_consultations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_insert" ON ai_consultations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_update" ON ai_consultations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_consultations_auth_delete" ON ai_consultations
  FOR DELETE USING (auth.uid() IS NOT NULL);
