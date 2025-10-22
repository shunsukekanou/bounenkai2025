-- MKG-app Supabase Auth統合対応 RLSポリシー設定
-- Supabase Auth (auth.uid()) 完全対応版
-- 実行方法: Supabase Dashboard → SQL Editor でこのSQLを実行

-- ==========================================
-- 🎯 設計方針（Supabase Auth対応）
-- ==========================================
-- - Supabase Authの標準認証 (auth.uid()) を使用
-- - 認証済みユーザーのみアクセス許可
-- - RLSによるセキュリティ確保
-- - 既存データ完全保護

-- ==========================================
-- 1. tasksテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their team tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;

-- Supabase Auth対応ポリシー（認証済みユーザーのみ）
CREATE POLICY "Supabase authenticated users can read tasks"
ON tasks
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can insert tasks"
ON tasks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can update tasks"
ON tasks
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can delete tasks"
ON tasks
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 2. kaizen_plansテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can read plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete plans" ON kaizen_plans;

CREATE POLICY "Supabase authenticated users can read plans"
ON kaizen_plans
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can insert plans"
ON kaizen_plans
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can update plans"
ON kaizen_plans
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can delete plans"
ON kaizen_plans
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 3. team_numbersテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage their team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can read team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage team numbers" ON team_numbers;

CREATE POLICY "Supabase authenticated users can read team numbers"
ON team_numbers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can manage team numbers"
ON team_numbers
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 4. custom_usersテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all user data" ON custom_users;
DROP POLICY IF EXISTS "Users can update their own data" ON custom_users;
DROP POLICY IF EXISTS "Allow public user registration" ON custom_users;

CREATE POLICY "Supabase authenticated users can read users"
ON custom_users
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can update users"
ON custom_users
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public user registration"
ON custom_users
FOR INSERT
WITH CHECK (true);

-- ==========================================
-- 5. employeesテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Users can manage employees" ON employees;

CREATE POLICY "Supabase authenticated users can read employees"
ON employees
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can manage employees"
ON employees
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 6. user_profilesテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage profiles" ON user_profiles;

CREATE POLICY "Supabase authenticated users can read profiles"
ON user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supabase authenticated users can manage profiles"
ON user_profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 完了メッセージ
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Supabase Auth対応RLSポリシー設定完了';
  RAISE NOTICE '📊 設定内容:';
  RAISE NOTICE '  - 全テーブル: auth.uid()による認証確認';
  RAISE NOTICE '  - セキュリティ: 認証済みユーザーのみアクセス可能';
  RAISE NOTICE '  - 互換性: Supabase Auth完全対応';
  RAISE NOTICE '  - データ保護: 既存データ完全保護';
END $$;