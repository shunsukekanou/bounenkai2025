import React, { useState, useEffect } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { handleSupabaseCall } from '../lib/errorHandler'
import Button, { SaveButton, CancelButton } from './common/Button'
import Input, { Textarea, Select } from './common/Input'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorBoundary from './common/ErrorBoundary'
import { StatusManager, StatusBadge, KAIZEN_STATUS } from './StatusManager'

/**
 * 活動報告書作成フォーム（強化版）
 * 共通コンポーネント使用・エラー耐性向上・UI/UX改善
 */
export default function ActivityReportFormEnhanced({ 
  plan, 
  onSuccess, 
  onCancel, 
  initialData = null, 
  teamId 
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || `${plan?.title || ''} - 活動報告書`,
    implementationContent: initialData?.implementation_content || '',
    actualStartDate: initialData?.actual_start_date || plan?.actual_start_date || plan?.start_date || '',
    actualEndDate: initialData?.actual_end_date || plan?.actual_end_date || plan?.end_date || '',
    participants: initialData?.participants || [],
    improvementEffect: initialData?.improvement_effect || '',
    numericalResults: initialData?.numerical_results || {},
    futureChallenges: initialData?.future_challenges || '',
    expansionPotential: initialData?.expansion_potential || '',
    status: initialData?.status || 'draft'
  })

  const [beforeImages, setBeforeImages] = useState(initialData?.before_images || [])
  const [afterImages, setAfterImages] = useState(initialData?.after_images || [])
  const [referenceFiles, setReferenceFiles] = useState(initialData?.reference_files || [])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  // 数値結果の項目
  const [numericalItems, setNumericalItems] = useState([
    { key: 'efficiency', label: '効率改善', value: '', unit: '%', before: '', after: '' },
    { key: 'cost', label: 'コスト削減', value: '', unit: '円', before: '', after: '' },
    { key: 'time', label: '時間短縮', value: '', unit: '分', before: '', after: '' },
    { key: 'quality', label: '品質向上', value: '', unit: '%', before: '', after: '' }
  ])

  useEffect(() => {
    if (initialData?.numerical_results) {
      const results = initialData.numerical_results
      setNumericalItems(numericalItems.map(item => ({
        ...item,
        value: results[item.key]?.value || '',
        before: results[item.key]?.before || '',
        after: results[item.key]?.after || ''
      })))
    }
  }, [initialData])

  // 入力値更新ハンドラー
  const handleInputChange = (field) => (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // バリデーション
  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です'
    } else if (formData.title.length < 5) {
      newErrors.title = 'タイトルは5文字以上で入力してください'
    }

    if (!formData.implementationContent.trim()) {
      newErrors.implementationContent = '実施内容は必須です'
    } else if (formData.implementationContent.length < 50) {
      newErrors.implementationContent = '実施内容は50文字以上で入力してください'
    }

    if (!formData.improvementEffect.trim()) {
      newErrors.improvementEffect = '改善効果は必須です'
    } else if (formData.improvementEffect.length < 20) {
      newErrors.improvementEffect = '改善効果は20文字以上で入力してください'
    }

    if (!formData.actualStartDate) {
      newErrors.actualStartDate = '実際の開始日は必須です'
    }

    if (!formData.actualEndDate) {
      newErrors.actualEndDate = '実際の終了日は必須です'
    }

    if (formData.actualStartDate && formData.actualEndDate && 
        formData.actualStartDate > formData.actualEndDate) {
      newErrors.actualEndDate = '終了日は開始日より後の日付を選択してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // フォーム送信
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setApiError(null)

    const result = await handleSupabaseCall(async () => {
      const user = await getUser()
      if (!user) {
        throw new Error('認証が必要です')
      }

      // 数値結果をオブジェクトに変換
      const numericalResults = {}
      numericalItems.forEach(item => {
        if (item.value || item.before || item.after) {
          numericalResults[item.key] = {
            label: item.label,
            value: parseFloat(item.value) || 0,
            unit: item.unit,
            before: parseFloat(item.before) || 0,
            after: parseFloat(item.after) || 0
          }
        }
      })

      // 報告書データ作成
      const reportData = {
        kaizen_plan_id: plan.id,
        title: formData.title.trim(),
        implementation_content: formData.implementationContent.trim(),
        actual_start_date: formData.actualStartDate,
        actual_end_date: formData.actualEndDate,
        participants: formData.participants,
        improvement_effect: formData.improvementEffect.trim(),
        numerical_results: numericalResults,
        before_images: beforeImages,
        after_images: afterImages,
        reference_files: referenceFiles,
        future_challenges: formData.futureChallenges.trim(),
        expansion_potential: formData.expansionPotential.trim(),
        status: formData.status,
        team_id: teamId,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      let reportId

      if (initialData) {
        // 更新
        const { error } = await supabase
          .from('activity_reports')
          .update(reportData)
          .eq('id', initialData.id)

        if (error) throw error
        reportId = initialData.id
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from('activity_reports')
          .insert(reportData)
          .select()
          .single()

        if (error) throw error
        reportId = data.id
      }

      return {
        id: reportId,
        ...reportData
      }
    }, {
      context: { component: 'ActivityReportForm', action: 'save' },
      retries: 1
    })

    setIsSubmitting(false)

    if (result.error) {
      setApiError(result.error.message)
    } else {
      onSuccess && onSuccess(result.data)
    }
  }

  // 参加者追加
  const addParticipant = () => {
    setFormData({
      ...formData,
      participants: [...formData.participants, { name: '', role: '' }]
    })
  }

  // 参加者削除
  const removeParticipant = (index) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((_, i) => i !== index)
    })
  }

  // 参加者更新
  const updateParticipant = (index, field, value) => {
    const newParticipants = [...formData.participants]
    newParticipants[index] = { ...newParticipants[index], [field]: value }
    setFormData({ ...formData, participants: newParticipants })
  }

  // 数値結果更新
  const updateNumericalItem = (index, field, value) => {
    const newItems = [...numericalItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setNumericalItems(newItems)
  }

  // 自動計算（改善値）
  const calculateImprovement = (item) => {
    if (item.before && item.after) {
      const before = parseFloat(item.before)
      const after = parseFloat(item.after)
      
      if (item.key === 'cost') {
        return Math.abs(before - after)
      } else {
        return Math.abs(((after - before) / before) * 100)
      }
    }
    return ''
  }

  const statusOptions = [
    { value: 'draft', label: '下書き' },
    { value: 'pending_review', label: 'レビュー待ち' },
    { value: 'approved', label: '承認済み' }
  ]

  if (isSubmitting) {
    return <LoadingSpinner size="large" message="活動報告書を保存中..." />
  }

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📊 {initialData ? '活動報告書編集' : '活動報告書作成'}
            </h2>
            <p className="text-gray-600 mt-1">
              カイゼン活動: {plan?.title}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <StatusBadge status={plan?.status} />
            {plan?.status && (
              <span className="text-sm text-gray-500">
                計画状態: {plan.status}
              </span>
            )}
          </div>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800">
              ❌ {apiError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本情報セクション */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 基本情報</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="報告書タイトル"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={errors.title}
                placeholder="活動報告書のタイトル"
                required
                className="md:col-span-2"
              />

              <Input
                label="実際の開始日"
                type="date"
                value={formData.actualStartDate}
                onChange={handleInputChange('actualStartDate')}
                error={errors.actualStartDate}
                required
              />

              <Input
                label="実際の終了日"
                type="date"
                value={formData.actualEndDate}
                onChange={handleInputChange('actualEndDate')}
                error={errors.actualEndDate}
                required
                min={formData.actualStartDate}
              />

              <Select
                label="報告書状態"
                value={formData.status}
                onChange={handleInputChange('status')}
                options={statusOptions}
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* 実施内容セクション */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">⚡ 実施内容</h3>
            
            <Textarea
              label="実施内容"
              value={formData.implementationContent}
              onChange={handleInputChange('implementationContent')}
              error={errors.implementationContent}
              placeholder="実際に行った改善活動の具体的な内容を詳しく記述してください（50文字以上）"
              rows={6}
              required
            />
          </div>

          {/* 参加者セクション */}
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-900">👥 参加者</h3>
              <Button
                type="button"
                onClick={addParticipant}
                variant="secondary"
                size="small"
              >
                ＋ 参加者追加
              </Button>
            </div>

            <div className="space-y-3">
              {formData.participants.map((participant, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <Input
                    placeholder="氏名"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="役割・部署"
                    value={participant.role}
                    onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    variant="danger"
                    size="small"
                  >
                    削除
                  </Button>
                </div>
              ))}

              {formData.participants.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  👤 参加者が登録されていません
                </div>
              )}
            </div>
          </div>

          {/* 改善効果セクション */}
          <div className="bg-yellow-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">📈 改善効果</h3>
            
            <Textarea
              label="改善効果"
              value={formData.improvementEffect}
              onChange={handleInputChange('improvementEffect')}
              error={errors.improvementEffect}
              placeholder="改善によって得られた効果や成果を具体的に記述してください（20文字以上）"
              rows={4}
              required
            />
          </div>

          {/* 定量的効果セクション */}
          <div className="bg-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-4">📊 定量的効果</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numericalItems.map((item, index) => (
                <div key={item.key} className="bg-white p-4 rounded border">
                  <h4 className="font-medium mb-3 text-gray-800">{item.label}</h4>
                  
                  <div className="space-y-3">
                    <Input
                      label={`改善前 (${item.unit})`}
                      type="number"
                      value={item.before}
                      onChange={(e) => updateNumericalItem(index, 'before', e.target.value)}
                      placeholder={`改善前の${item.label}`}
                      step="0.01"
                    />
                    
                    <Input
                      label={`改善後 (${item.unit})`}
                      type="number"
                      value={item.after}
                      onChange={(e) => updateNumericalItem(index, 'after', e.target.value)}
                      placeholder={`改善後の${item.label}`}
                      step="0.01"
                    />
                    
                    <Input
                      label={`改善値 (${item.unit})`}
                      type="number"
                      value={item.value || calculateImprovement(item)}
                      onChange={(e) => updateNumericalItem(index, 'value', e.target.value)}
                      placeholder="改善値（自動計算）"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 今後の展開セクション */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 今後の展開</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="今後の課題"
                value={formData.futureChallenges}
                onChange={handleInputChange('futureChallenges')}
                placeholder="今後の課題や改善点があれば記入してください"
                rows={4}
              />
              
              <Textarea
                label="横展開の可能性"
                value={formData.expansionPotential}
                onChange={handleInputChange('expansionPotential')}
                placeholder="他部門への展開可能性があれば記入してください"
                rows={4}
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <CancelButton onClick={onCancel} disabled={isSubmitting} />
            <SaveButton 
              type="submit"
              loading={isSubmitting}
              children={initialData ? '更新する' : '作成する'}
            />
          </div>
        </form>
      </div>
    </ErrorBoundary>
  )
}