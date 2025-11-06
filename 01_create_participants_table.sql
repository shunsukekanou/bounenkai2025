-- 1. games テーブルを作成します
-- このテーブルは、ビンゴゲームのセッション全体を管理します。
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  drawn_numbers INT[] DEFAULT '{}',
  winners JSONB DEFAULT '[]'::jsonb, -- ビンゴ達成者のリストを一時的にここに保存します
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. participants テーブルを作成します
-- このテーブルは、各ゲームの参加者情報を保持します。
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  bingo_rank INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. リアルタイム通知を有効にする設定
ALTER TABLE public.games REPLICA IDENTITY FULL;
alter publication supabase_realtime add table public.games;

ALTER TABLE public.participants REPLICA IDENTITY FULL;
alter publication supabase_realtime add table public.participants;

-- 4. セキュリティポリシーを設定します (games)
CREATE POLICY "Allow read access to all users on games"
ON public.games FOR SELECT USING (true);

CREATE POLICY "Allow insert access to all users on games"
ON public.games FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to all users on games"
ON public.games FOR UPDATE USING (true);

-- 5. セキュリティポリシーを設定します (participants)
CREATE POLICY "Allow read access to all users on participants"
ON public.participants FOR SELECT USING (true);

CREATE POLICY "Allow insert access to all users on participants"
ON public.participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to all users on participants"
ON public.participants FOR UPDATE USING (true);