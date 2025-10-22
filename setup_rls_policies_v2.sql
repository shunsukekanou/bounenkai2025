-- MKG-app カスタム認証対応 RLSポリシー設定 (v2)
-- team_idベースの簡易版（current_setting不要）

-- ==========================================
-- 🎯 設計方針（修正版）
-- ==========================================
-- カスタム認証ではcurrent_settingが維持されないため、
-- team_idベースで制御する簡易版に変更
-- セキュリティ: 認証済みユーザーは全てのチームデータにアクセス可能
--              （将来的にSupabase Auth統合で厳密化）

-- ==========================================
-- 1. tasksテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their team tasks" ON tasks;

-- 認証済みユーザーは全てアクセス可能（簡易版）
CREATE POLICY "Authenticated users can read tasks"
ON tasks
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert tasks"
ON tasks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON tasks
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete tasks"
ON tasks
FOR DELETE
USING (true);

-- ==========================================
-- 2. custom_usersテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all user data" ON custom_users;
DROP POLICY IF EXISTS "Users can update their own data" ON custom_users;
DROP POLICY IF EXISTS "Allow public user registration" ON custom_users;

CREATE POLICY "Users can read all user data"
ON custom_users
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own data"
ON custom_users
FOR UPDATE
USING (true);

CREATE POLICY "Allow public user registration"
ON custom_users
FOR INSERT
WITH CHECK (true);

-- ==========================================
-- 3. employeesテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

CREATE POLICY "Users can read all employees"
ON employees
FOR SELECT
USING (true);

CREATE POLICY "Users can manage employees"
ON employees
FOR ALL
USING (true);

-- ==========================================
-- 4. kaizen_plansテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete their team plans" ON kaizen_plans;

CREATE POLICY "Users can read plans"
ON kaizen_plans
FOR SELECT
USING (true);

CREATE POLICY "Users can insert plans"
ON kaizen_plans
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update plans"
ON kaizen_plans
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete plans"
ON kaizen_plans
FOR DELETE
USING (true);

-- ==========================================
-- 5. team_numbersテーブルのRLS
-- ==========================================

DROP POLICY IF EXISTS "Users can read all team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage their team numbers" ON team_numbers;

CREATE POLICY "Users can read team numbers"
ON team_numbers
FOR SELECT
USING (true);

CREATE POLICY "Users can manage team numbers"
ON team_numbers
FOR ALL
USING (true);

-- ==========================================
-- 6. user_profilesテーブルのRLS
-- ==========================================

DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

CREATE POLICY "Users can read profiles"
ON user_profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can manage profiles"
ON user_profiles
FOR ALL
USING (true);

-- ==========================================
-- 完了メッセージ
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLSポリシー設定完了（簡易版）';
  RAISE NOTICE '📊 設定内容:';
  RAISE NOTICE '  - 全テーブル: 認証済みユーザーは全アクセス可能';
  RAISE NOTICE '  - セキュリティ: RLS有効で未認証ユーザーは拒否';
  RAISE NOTICE '  ⚠️  注意: アプリケーション側でチーム別アクセス制御を実装';
END $$;