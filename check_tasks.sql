-- tasksテーブルの全データを確認
SELECT id, title, status, team_id, user_id, created_at
FROM tasks
WHERE team_id = 'GR'
ORDER BY created_at DESC
LIMIT 10;
