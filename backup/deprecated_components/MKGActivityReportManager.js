import React, { useState, useEffect } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { handleSupabaseCall } from '../lib/errorHandler'
import Button, { SaveButton } from './common/Button'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorBoundary from './common/ErrorBoundary'
import { StatusBadge } from './StatusManager'
import MKGActivityReportForm from './MKGActivityReportForm'
import MKGReportPreview from './MKGReportPreview'

/**
 * MKG活動報告書管理統合コンポーネント
 * フォーム作成・一覧表示・A4プレビュー・出力を統合
 */
export default function MKGActivityReportManager({ 
  teamId, 
  onClose,
  canApprove = false 
}) {
  const [reports, setReports] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list', 'create', 'edit', 'preview'

  // MKG報告書一覧取得
  const fetchReports = async () => {
    setLoading(true)
    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('mkg_activity_reports')
        .select(`
          *,
          created_by_user:created_by(email, raw_user_meta_data)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
    }, {
      context: { component: 'MKGActivityReportManager', action: 'fetchReports' }
    })

    setLoading(false)
    
    if (result.error) {
      setError(result.error.message)
    } else {
      setReports(result.data || [])
    }
  }

  useEffect(() => {
    if (teamId) {
      fetchReports()
    }
  }, [teamId])

  // 報告書削除
  const deleteReport = async (reportId) => {
    if (!window.confirm('この MKG活動報告書を削除してもよろしいですか？')) return

    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('mkg_activity_reports')
        .delete()
        .eq('id', reportId)
    })

    if (!result.error) {
      setReports(reports.filter(r => r.id !== reportId))
    }
  }

  // 報告書承認
  const approveReport = async (reportId) => {
    if (!window.confirm('この MKG活動報告書を承認してもよろしいですか？')) return

    const result = await handleSupabaseCall(async () => {
      return await supabase
        .from('mkg_activity_reports')
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
    setView('preview') // プレビュー表示に切り替え
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

  if (loading) {
    return <LoadingSpinner message="MKG活動報告書を読み込み中..." />
  }

  // 作成・編集フォーム表示
  if (view === 'create' || view === 'edit') {
    return (
      <MKGActivityReportForm
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

  // プレビュー表示
  if (view === 'preview' && currentReport) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
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
        <MKGReportPreview reportData={currentReport} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* ヘッダー */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#28a745',
                margin: '0 0 8px 0'
              }}>
                📊 MKG活動報告書管理
              </h2>
              <p style={{
                color: '#6c757d',
                fontSize: '16px',
                margin: '0'
              }}>
                MKGフォーマット準拠のA4活動報告書
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="small">
                  ✕ 閉じる
                </Button>
              )}
            </div>
          </div>

          {/* 統計情報 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#1976d2', fontWeight: '600' }}>
                総報告書数
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                {reports.length}件
              </div>
            </div>
            
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600' }}>
                承認済み
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {reports.filter(r => r.status === 'approved').length}件
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff3e0',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#f57c00', fontWeight: '600' }}>
                レビュー待ち
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                {reports.filter(r => r.status === 'pending_review').length}件
              </div>
            </div>

            <div style={{
              backgroundColor: '#fafafa',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#424242', fontWeight: '600' }}>
                下書き
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#424242' }}>
                {reports.filter(r => r.status === 'draft').length}件
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div>
            <Button
              onClick={() => setView('create')}
              variant="primary"
              style={{
                backgroundColor: '#28a745',
                fontSize: '16px',
                padding: '12px 24px'
              }}
            >
              ＋ 新しいMKG活動報告書を作成
            </Button>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626'
          }}>
            ❌ {error}
          </div>
        )}

        {/* 報告書一覧 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0',
              color: '#28a745'
            }}>
              📋 MKG活動報告書一覧
            </h3>
          </div>
          
          <div>
            {reports.length === 0 ? (
              <div style={{
                padding: '60px',
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  MKG活動報告書がありません
                </div>
                <div style={{ fontSize: '14px', marginBottom: '24px' }}>
                  カイゼン活動完了後にMKG形式の報告書を作成してください
                </div>
                <Button
                  onClick={() => setView('create')}
                  variant="primary"
                  style={{ backgroundColor: '#28a745' }}
                >
                  最初の報告書を作成
                </Button>
              </div>
            ) : (
              <div>
                {reports.map((report) => {
                  const statusConfig = getStatusConfig(report.status)
                  
                  return (
                    <div
                      key={report.id}
                      style={{
                        padding: '24px',
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            <h4 style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: '#28a745',
                              margin: '0'
                            }}>
                              {report.title}
                            </h4>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: statusConfig.color === 'bg-green-100 text-green-800' ? '#e8f5e8' : 
                                              statusConfig.color === 'bg-yellow-100 text-yellow-800' ? '#fff3e0' : '#f5f5f5',
                              color: statusConfig.color === 'bg-green-100 text-green-800' ? '#2e7d32' : 
                                     statusConfig.color === 'bg-yellow-100 text-yellow-800' ? '#f57c00' : '#424242'
                            }}>
                              {statusConfig.label}
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            fontSize: '14px',
                            color: '#6c757d',
                            marginBottom: '16px'
                          }}>
                            <div>
                              <span style={{ fontWeight: '600' }}>チーム:</span> {report.teamName}
                            </div>
                            <div>
                              <span style={{ fontWeight: '600' }}>カイゼンNo:</span> {report.kaizenNo}
                            </div>
                            <div>
                              <span style={{ fontWeight: '600' }}>活動期間:</span> 
                              {report.activityStartDate} 〜 {report.activityEndDate}
                            </div>
                            <div>
                              <span style={{ fontWeight: '600' }}>担当者:</span> {report.responsible}
                            </div>
                          </div>

                          {/* 概要 */}
                          {report.problemDescription && (
                            <div style={{
                              backgroundColor: '#f8f9fa',
                              padding: '12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              marginBottom: '12px'
                            }}>
                              <span style={{ fontWeight: '600', color: '#495057' }}>問題概要:</span>
                              <div style={{ marginTop: '4px', lineHeight: '1.4' }}>
                                {report.problemDescription.length > 100 
                                  ? `${report.problemDescription.substring(0, 100)}...`
                                  : report.problemDescription
                                }
                              </div>
                            </div>
                          )}

                          <div style={{
                            fontSize: '12px',
                            color: '#868e96'
                          }}>
                            作成日: {new Date(report.created_at).toLocaleDateString('ja-JP')}
                            {report.updated_at !== report.created_at && (
                              <span> • 更新日: {new Date(report.updated_at).toLocaleDateString('ja-JP')}</span>
                            )}
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginLeft: '20px'
                        }}>
                          <Button
                            onClick={() => {
                              setCurrentReport(report)
                              setView('preview')
                            }}
                            variant="info"
                            size="small"
                            style={{ minWidth: '80px' }}
                          >
                            プレビュー
                          </Button>
                          
                          <Button
                            onClick={() => {
                              setCurrentReport(report)
                              setView('edit')
                            }}
                            variant="secondary"
                            size="small"
                            style={{ minWidth: '80px' }}
                          >
                            編集
                          </Button>

                          {canApprove && report.status === 'pending_review' && (
                            <Button
                              onClick={() => approveReport(report.id)}
                              variant="success"
                              size="small"
                              style={{ minWidth: '80px' }}
                            >
                              承認
                            </Button>
                          )}

                          <Button
                            onClick={() => deleteReport(report.id)}
                            variant="danger"
                            size="small"
                            style={{ minWidth: '80px' }}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ガイドライン */}
        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '32px'
        }}>
          <h4 style={{
            fontWeight: '600',
            color: '#1976d2',
            marginBottom: '12px',
            fontSize: '16px'
          }}>
            📖 MKG活動報告書作成のポイント
          </h4>
          <ul style={{
            fontSize: '14px',
            color: '#1565c0',
            marginLeft: '16px',
            lineHeight: '1.6'
          }}>
            <li>MKG既定フォーマットに準拠したA4レイアウトで出力されます</li>
            <li>Before/After画像は必ず含めて、改善効果を視覚的に示してください</li>
            <li>カイゼンNo.は他部門との連携に使用される重要な識別番号です</li>
            <li>承認後の報告書は他課所への展開資料として活用可能です</li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  )
}