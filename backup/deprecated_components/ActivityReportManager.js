import React, { useState, useEffect } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { handleSupabaseCall } from '../lib/errorHandler'
import Button, { SaveButton } from './common/Button'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorBoundary from './common/ErrorBoundary'
import { StatusBadge } from './StatusManager'
import ActivityReportFormEnhanced from './ActivityReportFormEnhanced'
import ReportPreviewAndExport from './ReportPreviewAndExport'

/**
 * 活動報告書管理コンポーネント
 * 報告書の一覧表示・作成・編集・削除・承認機能を統合
 */
export default function ActivityReportManager({ 
  kaizenPlan, 
  teamId, 
  onClose,
  canApprove = false 
}) {
  const [reports, setReports] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list', 'create', 'edit', 'view'

  // 報告書一覧取得
  const fetchReports = async () => {
    if (!kaizenPlan?.id) return

    setLoading(true)
    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('activity_reports')
        .select('*')
        .eq('kaizen_plan_id', kaizenPlan.id)
        .order('created_at', { ascending: false })
    }, {
      context: { component: 'ActivityReportManager', action: 'fetchReports' }
    })

    setLoading(false)
    
    if (result.error) {
      setError(result.error.message)
    } else {
      setReports(result.data || [])
    }
  }

  useEffect(() => {
    if (kaizenPlan?.id) {
      fetchReports()
    }
  }, [kaizenPlan?.id])

  // 報告書削除
  const deleteReport = async (reportId) => {
    if (!window.confirm('この報告書を削除してもよろしいですか？')) return

    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('activity_reports')
        .delete()
        .eq('id', reportId)
    })

    if (!result.error) {
      setReports(reports.filter(r => r.id !== reportId))
    }
  }

  // 報告書承認
  const approveReport = async (reportId) => {
    if (!window.confirm('この報告書を承認してもよろしいですか？')) return

    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('activity_reports')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
    })

    if (!result.error) {
      fetchReports() // 再読み込み
    }
  }

  // 報告書作成/編集成功時
  const handleReportSuccess = (reportData) => {
    fetchReports() // リスト更新
    setCurrentReport(reportData) // 作成/更新されたレポートをセット
    setView('view') // プレビュー表示に切り替え
  }

  // ステータスによる色分け
  const getStatusConfig = (status) => {
    switch (status) {
      case 'draft':
        return { label: '下書き', color: 'bg-gray-100 text-gray-800' }
      case 'pending_review':
        return { label: 'レビュー待ち', color: 'bg-yellow-100 text-yellow-800' }
      case 'approved':
        return { label: '承認済み', color: 'bg-green-100 text-green-800' }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' }
    }
  }

  // 数値結果の概要表示
  const formatNumericalResults = (results) => {
    if (!results || Object.keys(results).length === 0) {
      return '数値データなし'
    }

    return Object.values(results)
      .filter(r => r.value && r.value !== 0)
      .map(r => `${r.label}: ${r.value}${r.unit}`)
      .join(', ') || '数値データなし'
  }

  // 参加者の概要表示
  const formatParticipants = (participants) => {
    if (!participants || participants.length === 0) {
      return '参加者情報なし'
    }

    return participants
      .filter(p => p.name)
      .map(p => `${p.name}${p.role ? `(${p.role})` : ''}`)
      .join(', ')
  }

  if (loading) {
    return <LoadingSpinner message="活動報告書を読み込み中..." />
  }

  // 作成・編集フォーム表示
  if (view === 'create' || view === 'edit') {
    return (
      <ActivityReportFormEnhanced
        plan={kaizenPlan}
        teamId={teamId}
        initialData={currentReport}
        onSuccess={handleReportSuccess}
        onCancel={() => {
          setView('list')
          setCurrentReport(null)
        }}
      />
    )
  }

  if (view === 'view' && currentReport) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => {
              setView('list')
              setCurrentReport(null)
            }}
            variant="secondary"
          >
            ← 報告書一覧に戻る
          </Button>
        </div>
        <ReportPreviewAndExport reportData={currentReport} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                📊 活動報告書管理
              </h2>
              <p className="text-gray-600 mt-1">
                カイゼン活動: {kaizenPlan?.title}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <StatusBadge status={kaizenPlan?.status} />
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="small">
                  ✕ 閉じる
                </Button>
              )}
            </div>
          </div>

          {/* 計画情報概要 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-blue-600 font-medium">計画期間</div>
              <div className="text-lg font-semibold">
                {kaizenPlan?.start_date} 〜 {kaizenPlan?.end_date}
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-sm text-purple-600 font-medium">報告書数</div>
              <div className="text-lg font-semibold">
                {reports.length}件
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-green-600 font-medium">承認済み</div>
              <div className="text-lg font-semibold">
                {reports.filter(r => r.status === 'approved').length}件
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3">
            <Button
              onClick={() => setView('create')}
              variant="primary"
            >
              ＋ 新しい報告書を作成
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="text-red-800">❌ {error}</div>
          </div>
        )}

        {/* 報告書一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">📋 活動報告書一覧</h3>
          </div>
          
          <div className="divide-y">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <div className="text-lg font-medium mb-2">活動報告書がありません</div>
                <div className="text-sm mb-4">
                  カイゼン活動完了後に報告書を作成してください
                </div>
                <Button
                  onClick={() => setView('create')}
                  variant="primary"
                >
                  最初の報告書を作成
                </Button>
              </div>
            ) : (
              reports.map((report) => {
                const statusConfig = getStatusConfig(report.status)
                
                return (
                  <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {report.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">実施期間:</span> 
                            {report.actual_start_date} 〜 {report.actual_end_date}
                          </div>
                          
                          <div>
                            <span className="font-medium">作成者:</span>
                            {report.created_by_user?.raw_user_meta_data?.full_name || 
                             report.created_by_user?.email || 
                             '不明'}
                          </div>
                          
                          <div className="md:col-span-2">
                            <span className="font-medium">参加者:</span>
                            {formatParticipants(report.participants)}
                          </div>
                          
                          <div className="md:col-span-2">
                            <span className="font-medium">定量効果:</span>
                            {formatNumericalResults(report.numerical_results)}
                          </div>
                        </div>

                        {/* 実施内容の抜粋 */}
                        {report.implementation_content && (
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            <span className="font-medium">実施内容:</span>
                            <p className="mt-1 line-clamp-2">
                              {report.implementation_content.length > 150 
                                ? `${report.implementation_content.substring(0, 150)}...`
                                : report.implementation_content
                              }
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="text-xs text-gray-500">
                            作成日: {new Date(report.created_at).toLocaleDateString('ja-JP')}
                            {report.updated_at !== report.created_at && (
                              <span> • 更新日: {new Date(report.updated_at).toLocaleDateString('ja-JP')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          onClick={() => {
                            setCurrentReport(report)
                            setView('view') // Set view to 'view'
                          }}
                          variant="info" // Use a suitable variant, e.g., 'info' or 'primary'
                          size="small"
                        >
                          表示
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentReport(report)
                            setView('edit')
                          }}
                          variant="secondary"
                          size="small"
                        >
                          編集
                        </Button>

                        {canApprove && report.status === 'pending_review' && (
                          <Button
                            onClick={() => approveReport(report.id)}
                            variant="success"
                            size="small"
                          >
                            承認
                          </Button>
                        )}

                        <Button
                          onClick={() => deleteReport(report.id)}
                          variant="danger"
                          size="small"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ガイドライン */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📖 活動報告書作成のポイント</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>実施内容は具体的かつ詳細に記述してください（50文字以上）</li>
            <li>改善効果は定量的な数値データとともに記載してください</li>
            <li>参加者の役割や貢献内容も含めることで活動の全体像が把握しやすくなります</li>
            <li>今後の課題や横展開の可能性も記載すると次の改善に役立ちます</li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  )
}