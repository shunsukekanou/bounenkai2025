# AI協力者・開発環境切り替え対応システム

## 🤖 対応AI一覧
- **Claude Code** (現在)
- **Gemini**
- **ChatGPT**
- **その他のAI開発アシスタント**

## 🔄 バトンタッチ手順

### 1. 新しいAIセッション開始時（必須）
```
まず以下のファイルを順番に読んでください：
1. AI_HANDOVER_SYSTEM.md（このファイル）
2. DEVELOPMENT_PROTOCOL.md（🚨絶対遵守🚨）
3. README_FOR_CLAUDE.md
4. DEVELOPMENT_GUIDELINES.md
5. PROJECT_STATUS.md
6. RECENT_CHANGES.md
```

### 2. 開発環境切り替え時（自動判断・自動対処）
```bash
# STEP 1: 環境状態確認（必須実行）
curl -s http://localhost:3000 | grep -q "MKG"

# 判定結果により自動分岐:
# ✅正常 → 作業開始
# ❌異常 → 自動的にSTEP 2実行
```

**STEP 2: 自動問題対処（STEP 1で異常の場合のみ実行）**
```bash
echo "🔧 Environment issue detected - Auto-fixing..."
pkill -f "next" 2>/dev/null || taskkill /f /im node.exe 2>/dev/null
rm -rf .next
npm install
npm run dev &
sleep 5
curl -s http://localhost:3000 | grep -q "MKG" && echo "✅ Auto-recovery successful"
```

**STEP 3: 緊急復旧（STEP 2でも失敗の場合のみ実行）**
```bash
echo "🚨 Emergency recovery required"
bash quick-recovery.sh
```

### 🤖 AI自動判断ルール
- `curl -s http://localhost:3000` が失敗 → 自動的にSTEP 2実行
- STEP 2後もMKGページが表示されない → 自動的にSTEP 3実行
- 判断に迷った場合 → より安全な上位ステップを実行

## 📋 重要な教育内容・方針

### 🎯 プロフェッショナルとしての基本姿勢
1. **テスト確認の却下** → 実装完了まで責任を持つ
2. **場当たり的対応の禁止** → 本格運用を念頭に置いた実装
3. **回避・迂回の禁止** → 根本的解決を徹底する
4. **プログラム上での確認必須** → ユーザーテスト前の徹底検証
5. **「回避や迂回は本格運用に影響ある場合はどんな時でも逃げずに対処してください」**

### 🔧 技術的要件
- データベース操作の迂回禁止 → 正しいRLS政策実装
- 複数チーム所属者への配慮 → 毎回チーム選択画面表示
- エラーハンドリングの徹底
- 継続的な動作確認とログ監視

## 📝 作業記録更新ルール

### 作業完了時（必須）
1. **PROJECT_STATUS.md**を更新
2. **RECENT_CHANGES.md**に変更内容記録
3. 重要な学習内容があれば**DEVELOPMENT_GUIDELINES.md**に追記

### 引き継ぎ時の確認事項
- [ ] 現在のサーバー状況確認
- [ ] 最近のエラーログ確認
- [ ] ユーザーからの最新要求理解
- [ ] 作業中タスクの状況確認

## 🚨 重要な禁止事項
- データベース操作の迂回
- 場当たり的な修正
- テストのみでの確認
- エラー隠蔽や回避
- 本格運用に影響する回避策

---
**このシステムにより、どのAI・どの開発環境でも一貫した品質で作業継続可能**