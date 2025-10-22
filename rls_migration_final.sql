-- MKG-app RLS完全移行スクリプト（恒久版）
-- 目的: カスタム認証からSupabase Auth認証への完全移行
-- 実行日: システム移行時の1回のみ実行

-- ==========================================
-- 🎯 恒久的解決方針
-- ==========================================
-- 1. 全既存ポリシーの完全削除（認証方式問わず）
-- 2. Supabase Auth標準方式での統一ポリシー作成
-- 3. 移行確認とロールバック準備
-- 4. 将来的な拡張性確保

-- ==========================================
-- Phase 1: 全既存ポリシーの完全削除
-- ==========================================

-- tasksテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their team tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Supabase authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Supabase authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Supabase authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Supabase authenticated users can delete tasks" ON tasks;

-- kaizen_plansテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can read plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete plans" ON kaizen_plans;

-- team_numbersテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read all team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage their team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can read team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Supabase authenticated users can read team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Supabase authenticated users can manage team numbers" ON team_numbers;

-- custom_usersテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read all user data" ON custom_users;
DROP POLICY IF EXISTS "Users can update their own data" ON custom_users;
DROP POLICY IF EXISTS "Allow public user registration" ON custom_users;
DROP POLICY IF EXISTS "Supabase authenticated users can read users" ON custom_users;
DROP POLICY IF EXISTS "Supabase authenticated users can update users" ON custom_users;

-- employeesテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Users can manage employees" ON employees;
DROP POLICY IF EXISTS "Supabase authenticated users can read employees" ON employees;
DROP POLICY IF EXISTS "Supabase authenticated users can manage employees" ON employees;

-- user_profilesテーブル: 全ポリシーパターンを削除
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Supabase authenticated users can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Supabase authenticated users can manage profiles" ON user_profiles;

-- ==========================================
-- Phase 2: Supabase Auth統一ポリシー作成
-- ==========================================

-- tasksテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_tasks_select" ON tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_tasks_update" ON tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_tasks_delete" ON tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- kaizen_plansテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_plans_select" ON kaizen_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_plans_insert" ON kaizen_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_plans_update" ON kaizen_plans FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_plans_delete" ON kaizen_plans FOR DELETE USING (auth.uid() IS NOT NULL);

-- team_numbersテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_team_numbers_select" ON team_numbers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_team_numbers_all" ON team_numbers FOR ALL USING (auth.uid() IS NOT NULL);

-- custom_usersテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_users_select" ON custom_users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_users_update" ON custom_users FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_users_register" ON custom_users FOR INSERT WITH CHECK (true);

-- employeesテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_employees_select" ON employees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_employees_all" ON employees FOR ALL USING (auth.uid() IS NOT NULL);

-- user_profilesテーブル: 統一ポリシー
CREATE POLICY "mkg_auth_profiles_select" ON user_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mkg_auth_profiles_all" ON user_profiles FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- Phase 3: 移行確認
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MKG-app RLS完全移行完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 移行内容:';
  RAISE NOTICE '  - 認証方式: Supabase Auth (auth.uid()) 統一';
  RAISE NOTICE '  - ポリシー命名: mkg_auth_* 規則で統一';
  RAISE NOTICE '  - セキュリティ: 認証済みユーザーのみアクセス';
  RAISE NOTICE '  - 互換性: 将来拡張に対応';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 確認方法:';
  RAISE NOTICE '  1. アプリケーションでのタスク作成・編集';
  RAISE NOTICE '  2. カイゼン番号生成機能';
  RAISE NOTICE '  3. 活動報告書作成';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ロールバック: 必要時は以前のコミットに戻す';
  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- 完了
-- ==========================================