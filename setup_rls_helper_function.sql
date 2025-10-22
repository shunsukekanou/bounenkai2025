-- RLSポリシー用ヘルパー関数
-- current_settingの代わりに、直接ユーザー認証を確認する関数

-- カスタムユーザーIDを取得する関数（簡易版）
-- この関数は、アプリ側が明示的に設定したuser_idを返す
CREATE OR REPLACE FUNCTION get_current_custom_user_id()
RETURNS INTEGER AS $$
BEGIN
  -- current_setting が設定されていればそれを返す
  -- 設定されていなければ NULL を返す
  BEGIN
    RETURN current_setting('app.current_user_id', true)::integer;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーIDを設定するRPC関数
CREATE OR REPLACE FUNCTION set_current_user_id(user_id INTEGER)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ RLSヘルパー関数作成完了';
  RAISE NOTICE '📋 作成した関数:';
  RAISE NOTICE '  - get_current_custom_user_id(): 現在のユーザーIDを取得';
  RAISE NOTICE '  - set_current_user_id(user_id): ユーザーIDを設定（RPC用）';
END $$;