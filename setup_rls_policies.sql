-- MKG-app カスタム認証対応 RLSポリシー設定
-- 実行方法: Supabase Dashboard → SQL Editor でこのSQLを実行

-- ==========================================
-- 🎯 設計方針
-- ==========================================
-- カスタム認証（custom_usersテーブル）に対応したRLSポリシー
-- - ユーザーIDはcustom_users.idを使用
-- - チーム別データ分離を実現
-- - セキュリティを維持

-- ==========================================
-- 1. tasksテーブルのRLSポリシー
-- ==========================================

-- 既存ポリシーを削除（もしあれば）
DROP POLICY IF EXISTS "Users can read their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their team tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their team tasks" ON tasks;

-- SELECT: ユーザーは自分のチームのタスクを閲覧可能
CREATE POLICY "Users can read their team tasks"
ON tasks
FOR SELECT
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- INSERT: ユーザーは自分のチームのタスクを作成可能
CREATE POLICY "Users can insert their team tasks"
ON tasks
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- UPDATE: ユーザーは自分のチームのタスクを更新可能
CREATE POLICY "Users can update their team tasks"
ON tasks
FOR UPDATE
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- DELETE: ユーザーは自分のチームのタスクを削除可能
CREATE POLICY "Users can delete their team tasks"
ON tasks
FOR DELETE
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- ==========================================
-- 2. custom_usersテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all user data" ON custom_users;
DROP POLICY IF EXISTS "Users can update their own data" ON custom_users;
DROP POLICY IF EXISTS "Allow public user registration" ON custom_users;

-- SELECT: 全ユーザー情報を閲覧可能（チーム情報確認のため）
CREATE POLICY "Users can read all user data"
ON custom_users
FOR SELECT
USING (true);

-- UPDATE: 自分の情報のみ更新可能
CREATE POLICY "Users can update their own data"
ON custom_users
FOR UPDATE
USING (id = current_setting('app.current_user_id', true)::integer);

-- INSERT: 新規登録を許可（認証前のユーザー登録）
CREATE POLICY "Allow public user registration"
ON custom_users
FOR INSERT
WITH CHECK (true);

-- ==========================================
-- 3. employeesテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

-- SELECT: 全ユーザーが社員情報を閲覧可能
CREATE POLICY "Users can read all employees"
ON employees
FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: 管理者のみ（kanou@mkg-app.local）
CREATE POLICY "Admins can manage employees"
ON employees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
    AND username = 'kanou'
  )
);

-- ==========================================
-- 4. kaizen_plansテーブルのRLSポリシー
-- ==========================================

DROP POLICY IF EXISTS "Users can read their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can insert their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can update their team plans" ON kaizen_plans;
DROP POLICY IF EXISTS "Users can delete their team plans" ON kaizen_plans;

-- SELECT: 自分のチームのカイゼン計画を閲覧可能
CREATE POLICY "Users can read their team plans"
ON kaizen_plans
FOR SELECT
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- INSERT: 自分のチームのカイゼン計画を作成可能
CREATE POLICY "Users can insert their team plans"
ON kaizen_plans
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- UPDATE: 自分のチームのカイゼン計画を更新可能
CREATE POLICY "Users can update their team plans"
ON kaizen_plans
FOR UPDATE
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- DELETE: 自分のチームのカイゼン計画を削除可能
CREATE POLICY "Users can delete their team plans"
ON kaizen_plans
FOR DELETE
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- ==========================================
-- 5. team_numbersテーブルのRLS設定
-- ==========================================

-- RLSを有効化
ALTER TABLE team_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all team numbers" ON team_numbers;
DROP POLICY IF EXISTS "Users can manage their team numbers" ON team_numbers;

-- SELECT: 全チームの番号情報を閲覧可能（番号確認のため）
CREATE POLICY "Users can read all team numbers"
ON team_numbers
FOR SELECT
USING (true);

-- INSERT/UPDATE: 自分のチームの番号のみ管理可能
CREATE POLICY "Users can manage their team numbers"
ON team_numbers
FOR ALL
USING (
  team_id IN (
    SELECT unnest(teams)
    FROM custom_users
    WHERE id = current_setting('app.current_user_id', true)::integer
  )
);

-- ==========================================
-- 6. user_profilesテーブルのRLS設定
-- ==========================================

-- RLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- SELECT: 全ユーザープロファイルを閲覧可能（チーム情報確認のため）
CREATE POLICY "Users can read all profiles"
ON user_profiles
FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: 自分のプロファイルのみ管理可能
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
USING (user_id = current_setting('app.current_user_id', true));

-- ==========================================
-- 完了メッセージ
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLSポリシー設定完了';
  RAISE NOTICE '📊 設定内容:';
  RAISE NOTICE '  - tasks: チーム別アクセス制御';
  RAISE NOTICE '  - custom_users: 全員閲覧可、自分のみ更新可';
  RAISE NOTICE '  - employees: 全員閲覧可、管理者のみ編集可';
  RAISE NOTICE '  - kaizen_plans: チーム別アクセス制御';
  RAISE NOTICE '  - team_numbers: 全員閲覧可、自チームのみ編集可';
  RAISE NOTICE '  - user_profiles: 全員閲覧可、自分のみ編集可';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 重要: アプリケーション側でcurrent_setting(''app.current_user_id'')を設定する必要があります';
END $$;