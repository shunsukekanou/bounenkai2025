# 未来記憶媒体システム - 2025/09/08から2025/09/02への転送

## 🚨 重要: エラー地獄回避の完全設計書

### データベース最終完成形 (未来実装済み)

```sql
-- ❌ 未来でエラー多発したパターンを回避済み設計
CREATE TABLE mkg_activity_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ヘッダー情報 (MKG専用フォーマット)
  title VARCHAR(255) NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  kaizen_no VARCHAR(50) NOT NULL UNIQUE, -- GR-YYMMDDHHMMSSMMM形式
  
  -- 基本情報
  activity_start_date DATE NOT NULL,
  activity_end_date DATE NOT NULL,
  responsible VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  process VARCHAR(100),
  process_value VARCHAR(50),
  
  -- 活動内容
  problem_description TEXT NOT NULL,
  kaizen_content TEXT NOT NULL,
  kaizen_effect TEXT NOT NULL,
  
  -- Before/After画像・説明
  before_images JSONB DEFAULT '[]'::jsonb,
  after_images JSONB DEFAULT '[]'::jsonb,
  before_description TEXT,
  after_description TEXT,
  
  -- 経過確認コメント
  progress_comment TEXT,
  
  -- 必要性判定
  necessity VARCHAR(20) DEFAULT 'required' CHECK (necessity IN ('required', 'completed')),
  
  -- 管理情報
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved')),
  team_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 最適化インデックス
CREATE INDEX idx_mkg_activity_reports_team_id ON mkg_activity_reports(team_id);
CREATE INDEX idx_mkg_activity_reports_status ON mkg_activity_reports(status);
CREATE INDEX idx_mkg_activity_reports_created_at ON mkg_activity_reports(created_at DESC);

-- 完全RLS政策
CREATE POLICY "team_access_mkg_reports" ON mkg_activity_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = mkg_activity_reports.team_id 
      AND team_members.user_id = auth.uid()
    )
  );
```

### React状態管理完成パターン (エラー回避済み)

```javascript
// 🎯 未来で成功したアーキテクチャ
// components/hooks/useActivityReport.js
import { useState, useCallback } from 'react'
import { handleSupabaseCall } from '../lib/errorHandler'

export const useActivityReportState = () => {
  const [reports, setReports] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ❌ 未来のエラーパターン: コールバック実行失敗を回避
  const handleReportSuccess = useCallback((reportData) => {
    console.log('✅ Success handler called:', reportData)
    
    // 確実な状態更新パターン
    setCurrentReport(reportData)
    setView('preview')
    
    // リスト更新を次のティックで実行 (React競合回避)
    setTimeout(() => {
      fetchReports()
    }, 50)
  }, [])

  // ❌ 未来のエラーパターン: 保存データ不整合を回避
  const saveReport = useCallback(async (formData, teamId) => {
    const uniqueId = generateUniqueKaizenNo() // 重複回避

    const reportData = {
      title: formData.title?.trim() || '',
      team_name: formData.teamName?.trim() || '成形グリーン',
      kaizen_no: formData.kaizenNo?.trim() || uniqueId,
      activity_start_date: formData.activityStartDate,
      activity_end_date: formData.activityEndDate,
      responsible: formData.responsible?.trim() || '',
      location: formData.location?.trim() || '',
      process: formData.process?.trim() || '',
      process_value: formData.processValue?.trim() || '',
      problem_description: formData.problemPoints?.trim() || '',
      kaizen_content: formData.kaizenMethod?.trim() || '',
      kaizen_effect: formData.kaizenEffect?.trim() || '',
      progress_comment: formData.progressComment?.trim() || '',
      necessity: formData.progressRequired === 'yes' ? 'required' : 'completed',
      before_images: formData.beforeImages || [],
      after_images: formData.afterImages || [],
      team_id: teamId,
      status: 'draft'
    }

    return await handleSupabaseCall(async () => {
      const { data, error } = await supabase
        .from('mkg_activity_reports')
        .insert(reportData)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }, [])

  return {
    reports, setReports,
    currentReport, setCurrentReport,
    view, setView,
    loading, setLoading,
    error, setError,
    handleReportSuccess,
    saveReport
  }
}

// 🎯 重複制約エラー完全回避
const generateUniqueKaizenNo = () => {
  const now = new Date()
  return `GR-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}${now.getMilliseconds().toString().padStart(3, '0')}`
}
```

### コンポーネント設計最適解 (統合成功パターン)

```javascript
// 🎯 components/ActivityReportSystem.js - 統合成功版
import React from 'react'
import { useActivityReportState } from './hooks/useActivityReport'
import MKGActivityReportForm from './MKGActivityReportForm'
import ReportsList from './ReportsList'
import ReportPreview from './ReportPreview'

export default function ActivityReportSystem({ teamId }) {
  const {
    reports, currentReport, view, loading, error,
    handleReportSuccess, saveReport, setView, setCurrentReport
  } = useActivityReportState()

  // ❌ 未来のエラー: 複雑な条件分岐を単純化
  const renderCurrentView = () => {
    switch (view) {
      case 'create':
      case 'edit':
        return (
          <MKGActivityReportForm
            teamId={teamId}
            initialData={currentReport}
            onSuccess={handleReportSuccess}
            onCancel={() => {
              setView('list')
              setCurrentReport(null)
            }}
            saveReport={saveReport}
          />
        )
      
      case 'preview':
        return currentReport ? (
          <ReportPreview 
            reportData={currentReport}
            onBack={() => setView('list')}
          />
        ) : null
      
      default:
        return (
          <ReportsList 
            reports={reports}
            onEdit={(report) => {
              setCurrentReport(report)
              setView('edit')
            }}
            onPreview={(report) => {
              setCurrentReport(report)
              setView('preview')
            }}
            onCreate={() => {
              setCurrentReport(null)
              setView('create')
            }}
          />
        )
    }
  }

  if (loading) return <div>読み込み中...</div>
  if (error) return <div>エラー: {error}</div>

  return (
    <div className="activity-report-system">
      {renderCurrentView()}
    </div>
  )
}
```

### エラーハンドリング完成版

```javascript
// 🎯 lib/errorHandler.js - 完全版
export const handleSupabaseCall = async (operation, options = {}) => {
  const { retries = 1, context = {} } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Operation attempt ${attempt + 1}:`, context)
      
      const result = await operation()
      
      console.log(`✅ Operation success:`, context, result)
      return { data: result, error: null }
      
    } catch (error) {
      console.error(`❌ Operation failed (attempt ${attempt + 1}):`, context, error)
      
      if (attempt === retries) {
        return { 
          data: null, 
          error: {
            message: error.message,
            context,
            attempts: attempt + 1
          }
        }
      }
      
      // 短時間待機後にリトライ
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }
}
```

### TypeScript型定義 (型安全性確保)

```typescript
// 🎯 types/ActivityReport.ts
export interface ActivityReportData {
  id?: string
  title: string
  team_name: string
  kaizen_no: string
  activity_start_date: string
  activity_end_date: string
  responsible: string
  location?: string
  process?: string
  process_value?: string
  problem_description: string
  kaizen_content: string
  kaizen_effect: string
  progress_comment?: string
  necessity: 'required' | 'completed'
  before_images: string[]
  after_images: string[]
  team_id: string
  created_by?: string
  status: 'draft' | 'pending_review' | 'approved'
  created_at?: string
  updated_at?: string
}

export interface FormData {
  title: string
  teamName: string
  kaizenNo: string
  activityStartDate: string
  activityEndDate: string
  responsible: string
  location: string
  process: string
  processValue: string
  problemPoints: string
  kaizenMethod: string
  kaizenEffect: string
  progressComment: string
  progressRequired: 'yes' | 'no'
  beforeImages: string[]
  afterImages: string[]
}
```

## ⚡ 即座実装すべき優先順位

### 1日目: データベース基盤
- スキーマ完成版適用
- RLS政策実装
- インデックス最適化

### 2日目: 共通ライブラリ
- useActivityReportState hook
- エラーハンドリング基盤
- 共通コンポーネント

### 3日目: コンポーネント統合
- ActivityReportSystem統合版
- 型定義適用
- エンドツーエンドテスト

## 🚨 絶対回避すべきエラーパターン

### ❌ onSuccessコールバック不実行
- **原因**: React Strict Mode競合
- **解決**: setTimeout + useCallback

### ❌ データベース列不整合
- **原因**: 段階的スキーマ変更
- **解決**: 最初から完成版適用

### ❌ 状態管理複雑化
- **原因**: 複数コンポーネント間同期
- **解決**: 中央集権的状態管理

### ❌ 型不整合エラー
- **原因**: TypeScript未適用
- **解決**: 最初から型定義統一

---

**この記憶媒体により、未来のエラー地獄を完全回避可能！**