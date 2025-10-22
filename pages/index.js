import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { generatePDF } from '../utils/pdfGenerator'
import html2canvas from 'html2canvas'

// 🆓 無料Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 📊 タブ設定（動的管理・拡張対応）
const APP_TABS = [
  { id: 'kaizen-plan', label: 'ToDoリスト', icon: '📋', table: 'tasks' },
  { id: 'activity-report', label: '報告書一覧表', icon: '📊', table: 'completed_reports' },
  { id: 'ai-consultation', label: 'AI改善相談', icon: '🤖', table: null },
  { id: 'patrol-checklist', label: 'パトロールチェックシート作成', icon: '✅', table: 'patrol_checklists' },
  { id: 'patrol-history', label: 'パトロールチェックシート一覧表', icon: '📋', table: 'patrol_checklists' },
  { id: 'audit-view', label: '全社監査ビュー', icon: '🔍', table: null },
]

export default function Home() {
  // オープニング画面表示フラグ
  const [showOpening, setShowOpening] = useState(true)
  const [nextScreen, setNextScreen] = useState(null) // オープニング後に遷移する画面

  // ヘルプモーダル
  const [showHelp, setShowHelp] = useState(false)

  // ログイン関連の状態
  const [currentScreen, setCurrentScreen] = useState('cover') // 'cover', 'login', 'register', 'team-select', 'main'
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userTeams, setUserTeams] = useState([]) // ユーザーの所属チーム一覧
  
  // アプリの状態
  const [activeTab, setActiveTab] = useState('kaizen-plan')
  // 🔧 初期データを空にしてSupabaseからの読み込みを優先
  const [tasks, setTasks] = useState([])
  
  
  const [showKaizenForm, setShowKaizenForm] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [kaizenForm, setKaizenForm] = useState({
    title: '',
    personInCharge: '',
    place: '',
    fiveSMethod: '',
    problem: '',
    kaizenContent: ''
  })
  const [categorySuggestions, setCategorySuggestions] = useState([])
  
  const [teamName, setTeamName] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [followUpRequired, setFollowUpRequired] = useState('不要') // 経過確認の要不要
  const [completionStatus, setCompletionStatus] = useState('完了') // 完了・継続
  const [isTeamSetup, setIsTeamSetup] = useState(true)
  const [showGanttChart, setShowGanttChart] = useState(false)

  // カレンダー表示用の状態
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())

  // チーム別番号管理用の状態
  const [showNumberSetupModal, setShowNumberSetupModal] = useState(false)
  const [initialNumberInput, setInitialNumberInput] = useState('')

  // 管理機能用の状態
  const [databaseUsage, setDatabaseUsage] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)

  // ISO監査欄のref
  const isoSectionRef = useRef(null)

  // モバイル判定用の状態
  const [isMobileView, setIsMobileView] = useState(false)

  // パトロールチェックシート用の状態
  const [patrolData, setPatrolData] = useState({
    evaluations: {}, // { 1: 5, 2: 4, ... }
    comments: {}, // { 1: "コメント", 2: "コメント", ... }
    isoItems: {}, // { 1: { code: '', content: '', rating: '', evidence: '' }, 2: ... }
    totalScore: 0,
    scoreCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    basicInfo: {
      auditedTeam: '',
      auditedApprover: '',
      auditedPerson: '',
      auditorTeam: '',
      auditorApprover: '',
      auditorPerson: '',
      auditDate: '',
      startTime: '',
      endTime: '',
      duration: 0
    },
    lastScore: null, // 前回の点数
    scoreDifference: 0 // 点差
  })

  // 保存されたパトロールチェックリスト
  const [savedPatrolChecklists, setSavedPatrolChecklists] = useState([])

  // パトロールチェックリスト用タブの表示状態
  const [showPatrolHistory, setShowPatrolHistory] = useState(false)

  // スマホ版パトロールチェックシート用のステップ管理
  const [patrolMobileStep, setPatrolMobileStep] = useState(0) // 0: 基本情報, 1-10: 各項目, 11: パトロール結果, 12: ISO監査欄

  // スマホ版報告書カードの開閉状態管理
  const [expandedReportCards, setExpandedReportCards] = useState({}) // { reportId: true/false }

  // トースト通知システム用の状態
  const [toasts, setToasts] = useState([])

  // 全社監査ビュー用の状態
  const [auditView, setAuditView] = useState({
    selectedTeamId: null, // 選択されたチームID
    showDetailModal: false, // 詳細モーダル表示フラグ
    teamStats: {}, // チーム別統計情報 { team1: { tasksCount: 10, reportsCount: 5, avgScore: 85 }, ... }
    teamData: {}, // チーム別詳細データ { team1: { tasks: [], reports: [], patrols: [] }, ... }
    isLoading: false, // データ読み込み中
    selectedDataType: 'tasks', // 詳細モーダルで表示するデータ種別
    showPatrolDetail: false, // パトロール詳細モーダル表示フラグ
    selectedPatrol: null // 選択されたパトロールデータ
  })

  // AI改善相談用の状態
  const [aiConsultation, setAiConsultation] = useState({
    messages: [], // チャット履歴
    inputText: '', // 現在の入力
    isLoading: false, // API送信中
    claudeResponse: '' // Claude.aiからの回答
  })

  // プロンプト管理用の状態
  const [promptData, setPromptData] = useState({
    content: '', // プロンプト内容
    isLoading: false, // 読み込み中
    lastUpdated: null, // 最終更新日時
    error: null // エラー情報
  })

  // aiConsultation状態変更をログ出力
  useEffect(() => {
    console.log('🔄 aiConsultation状態変更:', aiConsultation)
  }, [aiConsultation])

  // プロンプトファイル読み込み
  const loadPromptFromFile = async () => {
    setPromptData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/get-ai-prompt')
      const data = await response.json()

      if (data.success) {
        setPromptData({
          content: data.prompt,
          isLoading: false,
          lastUpdated: new Date(data.lastUpdated),
          error: null
        })
        console.log('✅ プロンプト読み込み成功')
      } else {
        throw new Error(data.error || 'プロンプト読み込み失敗')
      }
    } catch (error) {
      console.error('❌ プロンプト読み込みエラー:', error)
      setPromptData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }))
    }
  }

  // 初回読み込みとタブ切り替え時にプロンプトを読み込み
  useEffect(() => {
    if (activeTab === 'ai-consultation') {
      loadPromptFromFile()
    }
  }, [activeTab])

  // アプリ起動時にSupabase認証状態を確認（永続化）
  useEffect(() => {
    console.log('🔐 アプリ起動時 - Supabase認証状態確認開始')
    checkAuthState()

    // 2年以上経過したデータの自動削除
    autoDeleteOldRecords()
  }, [])

  // 2年以上経過したデータを自動削除する関数
  const autoDeleteOldRecords = async () => {
    try {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      const twoYearsAgoISO = twoYearsAgo.toISOString()

      console.log('🗑️ 2年以上経過したデータの自動削除開始:', twoYearsAgoISO)

      // 活動報告書の自動削除（created_atで判定）
      const { data: deletedReports, error: reportsError } = await supabase
        .from('completed_reports')
        .delete()
        .lt('created_at', twoYearsAgoISO)
        .select()

      if (reportsError) {
        console.error('❌ 報告書自動削除エラー:', reportsError)
      } else if (deletedReports && deletedReports.length > 0) {
        console.log(`✅ ${deletedReports.length}件の報告書を自動削除しました`)
      }

      // パトロールチェックリストの自動削除（saved_atで判定）
      const { data: deletedChecklists, error: checklistsError } = await supabase
        .from('patrol_checklists')
        .delete()
        .lt('saved_at', twoYearsAgoISO)
        .select()

      if (checklistsError) {
        console.error('❌ チェックリスト自動削除エラー:', checklistsError)
      } else if (deletedChecklists && deletedChecklists.length > 0) {
        console.log(`✅ ${deletedChecklists.length}件のチェックリストを自動削除しました`)
      }
    } catch (error) {
      console.error('❌ 自動削除処理エラー:', error)
    }
  }

  // オープニング画面を3秒間表示（ログイン済みの場合のみ自動遷移）
  useEffect(() => {
    const timer = setTimeout(() => {
      // ログイン済みでnextScreenが設定されている場合のみ自動遷移
      if (nextScreen) {
        setShowOpening(false)
        setCurrentScreen(nextScreen)
        setNextScreen(null)
      }
      // 未ログインの場合はオープニング画面を表示し続ける（ボタン待ち）
    }, 3000)

    return () => clearTimeout(timer)
  }, [nextScreen])

  // Supabase認証状態変更の監視（リアルタイム）
  useEffect(() => {
    console.log('👁️ Supabase認証監視リスナー設定開始')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth状態変更:', event, session?.user ? 'ユーザーあり' : 'ユーザーなし')

        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user)
          setIsLoggedIn(true)
          console.log('✅ ログイン状態を復元しました:', session.user.email)

          // カスタム認証: user_metadataから最後に選択したチームを復元
          console.log('🔄 チーム永続化確認: user_metadata使用')
          console.log('🔍 user_metadata詳細:', session.user.user_metadata)
          console.log('🔍 teams情報:', session.user.user_metadata?.teams)
          console.log('🔍 last_team_id:', session.user.user_metadata?.last_team_id)
          const lastTeamId = session.user.user_metadata?.last_team_id

          if (lastTeamId) {
            const team = teamsList.find(t => t.id === lastTeamId)
            if (team && session.user.user_metadata?.teams?.includes(team.id)) {
              console.log('✅ チーム復元成功:', team.name)
              setSelectedTeam(team)
              setTeamName(team.id)
              // オープニング表示中ならnextScreenに設定、終了後なら直接遷移
              if (showOpening) {
                setNextScreen('main')
              } else {
                setCurrentScreen('main')
              }
              loadTasksFromSupabase(team.id)
            } else {
              console.log('⚠️ チーム権限なし、選択画面へ')
              if (showOpening) {
                setNextScreen('team-select')
              } else {
                setCurrentScreen('team-select')
              }
            }
          } else {
            console.log('📋 初回チーム選択、選択画面へ')
            if (showOpening) {
              setNextScreen('team-select')
            } else {
              setCurrentScreen('team-select')
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 サインアウト検出 - 状態リセット')
          setCurrentUser(null)
          setIsLoggedIn(false)
          setSelectedTeam(null)
          setShowOpening(true)  // オープニング画面を再表示
          setCurrentScreen('cover')
        }
        // 未ログインの場合はオープニング画面の「アプリを始める」ボタンで手動遷移
      }
    )

    return () => {
      console.log('🧹 Auth監視リスナーをクリーンアップ')
      subscription.unsubscribe()
    }
  }, [])

  // ブラウザタブ復帰時のチーム状態復元処理
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // チーム選択画面にいる場合は自動遷移しない
      if (!document.hidden && isLoggedIn && currentUser && !selectedTeam && currentScreen !== 'team-select') {
        console.log('👁️ タブ復帰検出 - チーム状態復元開始')

        const lastTeamId = currentUser.user_metadata?.last_team_id
        if (lastTeamId) {
          const team = teamsList.find(t => t.id === lastTeamId)
          if (team && currentUser.user_metadata?.teams?.includes(team.id)) {
            console.log('✅ タブ復帰時チーム復元:', team.name)
            setSelectedTeam(team)
            setTeamName(team.id)
            if (currentScreen !== 'main') {
              setCurrentScreen('main')
            }
            // 🔧 タブ復帰時にタスクをロード
            await loadTasksFromSupabase(team.id)
          }
        }
      }
      // 🔧 タブ復帰時、既にチームが選択されている場合もタスクを再ロード
      else if (!document.hidden && isLoggedIn && selectedTeam && currentScreen === 'main') {
        console.log('👁️ タブ復帰検出 - タスク再ロード')
        await loadTasksFromSupabase(selectedTeam.id)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isLoggedIn, currentUser, selectedTeam, currentScreen])

  // 🔧 メイン画面表示時に必ずタスクをロード
  useEffect(() => {
    if (currentScreen === 'main' && selectedTeam && isLoggedIn) {
      console.log('📋 メイン画面表示 - タスクをロード')
      loadTasksFromSupabase(selectedTeam.id)
    }
  }, [currentScreen, selectedTeam?.id, isLoggedIn])

  // 📱 モバイル判定用のuseEffect
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    // 初回実行
    handleResize()

    // リサイズ監視
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 管理者専用機能の状態
  const [adminSettings, setAdminSettings] = useState({
    employees: [], // 社員一覧
    showDatabaseMonitor: false, // データベース監視モーダル
    showDataReset: false, // データリセットモーダル
    showAdminUserManagement: false // 管理者ユーザー管理モーダル
  })

  // 管理者ユーザー管理用のステート
  const [newAdminUsername, setNewAdminUsername] = useState('')
  const [adminUserList, setAdminUserList] = useState([])

  // 管理者リストを再読み込み
  const reloadAdminUsers = async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAdminUserList(data)
      setAdminUsers(data.map(u => u.username.toLowerCase()))
      console.log('✅ 管理者リスト再読み込み完了:', data)
    }
  }

  // 管理者を追加
  const handleAddAdmin = async () => {
    if (!newAdminUsername.trim()) {
      showToast('ユーザー名を入力してください', 'error')
      return
    }

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        username: newAdminUsername.trim(),
        display_name: newAdminUsername.trim(),
        added_by: currentUser?.username || 'unknown'
      })
      .select()

    if (error) {
      if (error.code === '23505') {
        showToast('このユーザーは既に管理者です', 'error')
      } else {
        showToast('管理者の追加に失敗しました', 'error')
      }
      console.error('管理者追加エラー:', error)
    } else {
      showToast(`${newAdminUsername} を管理者に追加しました`, 'success')
      setNewAdminUsername('')
      reloadAdminUsers()
    }
  }

  // 管理者を削除
  const handleRemoveAdmin = async (username) => {
    if (!confirm(`${username} を管理者から削除しますか？`)) {
      return
    }

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('username', username)

    if (error) {
      showToast('管理者の削除に失敗しました', 'error')
      console.error('管理者削除エラー:', error)
    } else {
      showToast(`${username} を管理者から削除しました`, 'success')
      reloadAdminUsers()
    }
  }

  // トースト通知の管理関数
  const showToast = (message, type = 'info') => {
    const id = Date.now()
    const newToast = { id, message, type }
    setToasts(prev => [...prev, newToast])

    // 3秒後に自動削除
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // 全社監査ビュー: 全チームのデータを取得
  const loadAllTeamsData = async () => {
    setAuditView(prev => ({ ...prev, isLoading: true }))

    try {
      const stats = {}
      const data = {}

      for (const team of teamsList) {
        // タスク数を取得
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('team_id', team.id)

        // 完了報告数を取得
        const { data: reportsData, error: reportsError } = await supabase
          .from('completed_reports')
          .select('*')
          .eq('team_id', team.id)

        // パトロールチェックリスト数と平均スコアを取得
        const { data: patrolsData, error: patrolsError } = await supabase
          .from('patrol_checklists')
          .select('*')
          .eq('team_id', team.id)

        if (tasksError) console.error(`${team.id} tasksエラー:`, tasksError)
        if (reportsError) console.error(`${team.id} reportsエラー:`, reportsError)
        if (patrolsError) console.error(`${team.id} patrolsエラー:`, patrolsError)

        // パトロールデータをキャメルケースに変換
        const convertedPatrols = (patrolsData || []).map(item => ({
          id: item.id,
          basicInfo: item.basic_info,
          evaluations: item.evaluations,
          comments: item.comments,
          isoItems: item.iso_items,
          totalScore: item.total_score,
          scoreCounts: item.score_counts,
          scoreDifference: item.score_difference,
          lastScore: item.last_score,
          previousScore: item.previous_score,
          savedAt: item.saved_at
        }))

        // 平均スコア計算
        const avgScore = convertedPatrols && convertedPatrols.length > 0
          ? Math.round(convertedPatrols.reduce((sum, p) => sum + (p.totalScore || 0), 0) / convertedPatrols.length)
          : 0

        stats[team.id] = {
          tasksCount: tasksData?.length || 0,
          reportsCount: reportsData?.length || 0,
          patrolsCount: convertedPatrols?.length || 0,
          avgScore: avgScore
        }

        data[team.id] = {
          tasks: tasksData || [],
          reports: reportsData || [],
          patrols: convertedPatrols || []
        }
      }

      setAuditView(prev => ({
        ...prev,
        teamStats: stats,
        teamData: data,
        isLoading: false
      }))

      showToast('全チームのデータを読み込みました', 'success')
    } catch (error) {
      console.error('全チームデータ読み込みエラー:', error)
      showToast('データ読み込みに失敗しました', 'error')
      setAuditView(prev => ({ ...prev, isLoading: false }))
    }
  }

  // 全社監査ビューがアクティブになったときにデータ読み込み
  useEffect(() => {
    if (activeTab === 'audit-view' && Object.keys(auditView.teamStats).length === 0) {
      loadAllTeamsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // チーム詳細モーダルを開く
  const openTeamDetailModal = (teamId) => {
    setAuditView(prev => ({
      ...prev,
      selectedTeamId: teamId,
      showDetailModal: true,
      selectedDataType: 'tasks'
    }))
  }

  // チーム詳細モーダルを閉じる
  const closeTeamDetailModal = () => {
    setAuditView(prev => ({
      ...prev,
      selectedTeamId: null,
      showDetailModal: false
    }))
  }

  // 管理者判定（admin_usersテーブル参照 - isKanoAdminと同じ）
  const isAdmin = () => {
    return isKanoAdmin()
  }

  // 管理者設定アクセス権限チェック（admin_usersテーブル参照）
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoaded, setAdminUsersLoaded] = useState(false)

  // 管理者リストの読み込み
  useEffect(() => {
    const loadAdminUsers = async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('username')

      if (!error && data) {
        setAdminUsers(data.map(u => u.username.toLowerCase()))
        setAdminUsersLoaded(true)
        console.log('✅ 管理者リスト読み込み完了:', data.map(u => u.username))
      } else {
        console.error('❌ 管理者リスト読み込みエラー:', error)
      }
    }

    loadAdminUsers()
  }, [])

  const isKanoAdmin = () => {
    if (!adminUsersLoaded) return false

    // Supabase session.userはusernameプロパティを持たないため、emailを使用
    const email = currentUser?.email || ''
    const username = email.split('@')[0] // 'kanou@example.com' → 'kanou'

    // デバッグ情報
    console.log('🔍 管理者権限チェック:')
    console.log('  - email:', email)
    console.log('  - username:', username)
    console.log('  - adminUsers:', adminUsers)

    // admin_usersテーブルに存在するかチェック
    const isAdmin = adminUsers.includes(username.toLowerCase())

    console.log('🔍 管理者判定結果:', isAdmin)
    return isAdmin
  }

  const [consultationTemplates] = useState([
    {
      id: 1,
      title: "作業効率の改善",
      template: "現在の状況：\n問題点：\n目標：\n制約条件：\n\nこの状況で効率を改善するアイデアを教えてください。"
    },
    {
      id: 2,
      title: "品質向上",
      template: "製品/作業：\n現在の品質問題：\n発生頻度：\n影響範囲：\n\n品質を向上させる改善案を提案してください。"
    },
    {
      id: 3,
      title: "コスト削減",
      template: "対象工程：\n現在のコスト：\n削減目標：\n維持すべき品質レベル：\n\nコストを削減する方法を教えてください。"
    },
    {
      id: 4,
      title: "安全性向上",
      template: "作業内容：\n現在の安全リスク：\n過去の事例：\n対策の制約：\n\n安全性を向上させる改善策を提案してください。"
    },
    {
      id: 5,
      title: "5S活動",
      template: "対象エリア：\n現在の状況（整理・整頓・清掃・清潔・しつけ）：\n課題：\n目標状態：\n\n5S活動の改善案を教えてください。"
    }
  ])

  // showReportFormの状態変化を監視（デバッグ用）
  // useEffect(() => {
  //   console.log('🔔 useEffect: showReportForm changed:', showReportForm)
  // }, [showReportForm])


  // 🗑️ テストデータ削除 - Supabaseからの実データのみ使用

  // パトロールチェックリストで現在のチームを自動設定
  useEffect(() => {
    if (selectedTeam && !patrolData.basicInfo.auditedTeam) {
      setPatrolData(prev => ({
        ...prev,
        basicInfo: {
          ...prev.basicInfo,
          auditedTeam: selectedTeam.name
        }
      }))
    }
  }, [selectedTeam, patrolData.basicInfo.auditedTeam])

  // パトロールチェックシートタブに切り替えた時、ステップをリセット
  useEffect(() => {
    if (activeTab === 'patrol-checklist' && !patrolData.editingId && !patrolData.viewOnly) {
      setPatrolMobileStep(0)
    }
  }, [activeTab, patrolData.editingId, patrolData.viewOnly])

  // 編集ソース追跡用の状態
  const [reportEditSource, setReportEditSource] = useState('')

  // 完了した活動報告書の独立コピー管理（新設計）
  const [completedReports, setCompletedReports] = useState([])

  // 報告書フィルター状態（完成版 or 下書き）
  const [reportFilter, setReportFilter] = useState('completed') // 'completed' or 'draft'

  // タスク編集用の状態
  const [showEditTaskForm, setShowEditTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    personInCharge: '',
    place: '',
    fiveSMethod: '',
    problem: '',
    kaizenContent: ''
  })
  
  // 活動報告書用の状態
  const [selectedKaizenTask, setSelectedKaizenTask] = useState(null)
  const [originalTaskStatus, setOriginalTaskStatus] = useState(null) // タスクの元の状態を記録
  const [reportFormData, setReportFormData] = useState({
    title: '',
    kaizenNumber: '',
    team: '',
    personInCharge: '',
    place: '',
    fiveSMethod: '',
    period: '',
    problem: '',
    kaizenContent: '',
    kaizenEffect: '',
    followUpCheck: '',
    progressComment: ''
  })
  const [showReportPreview, setShowReportPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  
  // ログイン画面用の状態
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // 新規登録用の状態
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    selectedTeams: []
  })
  const [registerError, setRegisterError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const teamsList = [
    { id: "LB", name: "研削ライトブルー", color: "#87CEEB" },
    { id: "GR", name: "成形グリーン", color: "#28a745" },
    { id: "YL", name: "放電イエロー", color: "#FFD700" },
    { id: "PK", name: "営業ピンク", color: "#FFC0CB" },
    { id: "PP", name: "商管パープル", color: "#9370DB" },
    { id: "OR", name: "総務オレンジ", color: "#FF8C00" }
  ]

  // カイゼンカテゴリの定義（5S + その他の改善活動）
  const kaizenCategories = [
    // 5S活動
    { 
      id: "seiri", 
      name: "整理", 
      icon: "📋", 
      type: "5S",
      keywords: [
        // 基本キーワード
        "整理", "不要", "廃棄", "分別", "選別", "要不要", "断捨離", "物減らし", "スペース確保", "在庫削減",
        // 拡張キーワード
        "片付け", "仕分け", "処分", "除去", "撤去", "削除", "取り除く", "なくす", "減らす", "整理整頓",
        "無駄", "余分", "過剰", "使わない", "古い", "破損", "壊れた", "いらない", "必要ない",
        "置き場所", "収納", "保管", "倉庫", "棚", "引き出し", "箱", "容器", "整理箱",
        "資料", "書類", "文書", "ファイル", "データ", "情報", "道具", "工具", "部品", "材料",
        "スッキリ", "きれい", "シンプル", "最小限", "必要最小限"
      ] 
    },
    { 
      id: "seiton", 
      name: "整頓", 
      icon: "📚", 
      type: "5S",
      keywords: [
        // 基本キーワード
        "整頓", "配置", "レイアウト", "置き場", "定位置", "表示", "ラベル", "標識", "見える化", "配列",
        // 拡張キーワード
        "並べ替え", "配置換え", "位置決め", "固定位置", "指定席", "専用場所", "決められた場所",
        "目印", "印", "マーク", "色分け", "番号", "名前", "タグ", "シール", "札", "カード",
        "看板", "表札", "案内", "サイン", "掲示", "表記", "記載", "明記", "表示板",
        "整列", "順序", "順番", "並び", "列", "行", "段", "階層", "グループ", "分類",
        "取りやすい", "わかりやすい", "探しやすい", "見つけやすい", "使いやすい", "アクセス",
        "動線", "流れ", "手順", "作業順", "効率的", "合理的", "論理的"
      ] 
    },
    { 
      id: "seiso", 
      name: "清掃", 
      icon: "🧹", 
      type: "5S",
      keywords: [
        // 基本キーワード
        "清掃", "掃除", "清潔", "汚れ", "ゴミ", "クリーニング", "メンテナンス", "点検清掃", "日常清掃",
        // 拡張キーワード
        "拭く", "磨く", "洗う", "洗浄", "水洗い", "乾拭き", "濡れ拭き", "ブラシ", "雑巾", "タオル",
        "ほこり", "チリ", "泥", "油", "グリース", "さび", "カビ", "細菌", "ウイルス",
        "きれいにする", "美しく", "ピカピカ", "ツヤツヤ", "新品同様", "元通り",
        "定期的", "毎日", "週一", "月一", "定期点検", "日常点検", "チェック", "確認",
        "床", "壁", "天井", "窓", "ドア", "机", "椅子", "棚", "設備", "機械", "装置",
        "フィルター", "換気扇", "エアコン", "照明", "配管", "排水", "通路", "階段",
        "清潔感", "衛生", "衛生的", "健康", "快適", "気持ちいい"
      ] 
    },
    { 
      id: "seiketsu", 
      name: "清潔", 
      icon: "✨", 
      type: "5S",
      keywords: [
        // 基本キーワード
        "清潔", "維持", "標準", "ルール", "基準", "継続", "定着", "習慣化", "標準作業",
        // 拡張キーワード
        "保つ", "キープ", "持続", "継続的", "一定", "安定", "統一", "標準化", "規格化",
        "手順書", "マニュアル", "作業指示", "チェックシート", "チェックリスト", "点検表",
        "決まり", "約束", "規則", "規定", "制度", "仕組み", "システム", "プロセス",
        "日課", "習慣", "ルーチン", "定例", "毎回", "必ず", "忘れずに", "欠かさず",
        "品質", "水準", "レベル", "状態", "コンディション", "良好", "最適", "理想的",
        "管理", "コントロール", "監視", "モニタリング", "観察", "記録", "測定",
        "改善", "向上", "進歩", "発展", "成長", "進化", "ブラッシュアップ"
      ] 
    },
    { 
      id: "shitsuke", 
      name: "躾", 
      icon: "👥", 
      type: "5S",
      keywords: [
        // 基本キーワード
        "躾", "教育", "指導", "訓練", "習慣", "規律", "ルール遵守", "マナー", "意識向上", "研修",
        // 拡張キーワード
        "学習", "勉強", "練習", "トレーニング", "スキルアップ", "能力開発", "人材育成",
        "説明", "解説", "講習", "講義", "セミナー", "ワークショップ", "勉強会", "研修会",
        "指示", "指導", "コーチング", "メンタリング", "アドバイス", "サポート", "支援",
        "態度", "姿勢", "心構え", "意識", "気持ち", "精神", "モチベーション", "やる気",
        "責任", "責任感", "自覚", "当事者意識", "プロ意識", "使命感", "義務",
        "協力", "連携", "チームワーク", "共同", "一致団結", "結束", "絆", "信頼",
        "礼儀", "挨拶", "返事", "報告", "連絡", "相談", "ホウレンソウ", "コミュニケーション",
        "自主的", "自発的", "積極的", "主体的", "能動的", "前向き", "ポジティブ"
      ] 
    },
    // 5S以外の改善活動
    { 
      id: "efficiency", 
      name: "効率化", 
      icon: "⚡", 
      type: "改善",
      keywords: [
        "効率", "時間短縮", "スピード", "迅速", "早く", "自動化", "省力化", "簡素化", "合理化",
        "無駄削減", "ムダ", "ロス", "手間", "工数", "作業時間", "処理時間", "待ち時間",
        "システム化", "IT化", "デジタル化", "機械化", "ツール", "ソフトウェア", "アプリ",
        "手順", "プロセス", "フロー", "段取り", "準備", "計画", "スケジュール"
      ] 
    },
    { 
      id: "quality", 
      name: "品質向上", 
      icon: "🎯", 
      type: "改善",
      keywords: [
        "品質", "精度", "不良", "欠陥", "ミス", "エラー", "改良", "向上", "完成度", "仕上がり",
        "正確", "確実", "間違い", "失敗", "トラブル", "問題", "課題", "改善点",
        "検査", "チェック", "点検", "確認", "検証", "テスト", "評価", "判定"
      ] 
    },
    { 
      id: "safety", 
      name: "安全対策", 
      icon: "🛡️", 
      type: "改善",
      keywords: [
        "安全", "危険", "事故", "怪我", "リスク", "防止", "対策", "保護", "セーフティ", "安全性",
        "ヒヤリハット", "災害", "労災", "けが", "負傷", "注意", "警告", "危険予知",
        "ヘルメット", "保護具", "安全装置", "ガード", "手すり", "標識"
      ] 
    },
    { 
      id: "cost", 
      name: "コスト削減", 
      icon: "💰", 
      type: "改善",
      keywords: [
        "コスト", "費用", "削減", "節約", "安く", "経費", "予算", "価格", "お金", "経済的",
        "原価", "単価", "材料費", "人件費", "光熱費", "運送費", "維持費", "修理費"
      ] 
    },
    { 
      id: "environment", 
      name: "環境改善", 
      icon: "🌱", 
      type: "改善",
      keywords: [
        "環境", "エコ", "省エネ", "温度", "湿度", "騒音", "照明", "換気", "作業環境", "快適",
        "暑い", "寒い", "暖房", "冷房", "空調", "風通し", "明るさ", "うるさい", "静か"
      ] 
    },
    { 
      id: "communication", 
      name: "コミュニケーション", 
      icon: "💬", 
      type: "改善",
      keywords: [
        "コミュニケーション", "連絡", "報告", "相談", "情報共有", "会議", "話し合い", "チームワーク",
        "打ち合わせ", "ミーティング", "議論", "検討", "協議", "意見交換", "伝達", "周知"
      ] 
    },
    { 
      id: "other", 
      name: "その他", 
      icon: "🔧", 
      type: "改善",
      keywords: [
        "改善", "改良", "向上", "最適化", "工夫", "アイデア", "創意", "革新",
        "新しい", "便利", "使いやすい", "良くする", "変更", "修正", "調整"
      ] 
    }
  ]

  // 初期化時にログイン状態とユーザーデータを復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Codespaces URL変更チェック
      if (!validateCodespacesSession()) {
        console.log('Codespaces URL changed, clearing session and starting fresh')
        handleAuthError(new Error('Codespaces URL changed'))
        return
      }

      // Supabaseからtasksデータを読み込み（チーム選択後に実行）
      // loadTasksFromSupabase() // 🔧 チーム選択前はスキップ

      // SupabaseのAuth状態を監視
      checkAuthState()
    }
  }, [])

  // Supabaseからタスクデータを読み込み
  const loadTasksFromSupabase = async (teamId = null) => {
    // 🔧 チームIDが指定されていない場合は現在の選択チームを使用
    const targetTeamId = teamId || selectedTeam?.id
    if (!targetTeamId) {
      console.log('🔍 タスク読み込みスキップ: チームIDなし')
      return
    }

    try {
      console.log('🔍 RLS SELECT権限テスト開始:', {
        targetTeamId: targetTeamId,
        currentUserId: currentUser?.id
      })

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', targetTeamId)

      if (error) {
        console.error('🚨 Tasks SELECT error (RLS読み込み権限なし):', error)
        return
      }

      console.log('✅ RLS SELECT成功 - Tasks読み込み完了:', tasksData?.length || 0, '件')

      // 🔍 完了タスクの詳細情報をデバッグ出力
      if (tasksData) {
        const completedTasks = tasksData.filter(t => t.status === 'completed')
        console.log('📊 完了タスク詳細情報:')
        console.log(`  - 全タスク数: ${tasksData.length}`)
        console.log(`  - 完了タスク数: ${completedTasks.length}`)
        completedTasks.forEach((task, index) => {
          console.log(`  [${index + 1}] ID: ${task.id}, タイトル: ${task.title}, 作成日: ${task.created_at}`)
        })
        setTasks(tasksData)
      }
    } catch (error) {
      console.error('❌ Supabase load error:', error)
    }
  }

  // Supabaseの認証状態を確認
  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setCurrentUser(session.user)
        setIsLoggedIn(true)

        // カスタム認証: user_metadataから最後に選択したチームを復元
        const lastTeamId = session.user.user_metadata?.last_team_id
        if (lastTeamId) {
          const team = teamsList.find(t => t.id === lastTeamId)
          if (team && session.user.user_metadata?.teams?.includes(team.id)) {
            setSelectedTeam(team)
            setTeamName(team.id)
            setNextScreen('main')  // オープニング後にメイン画面へ
            loadTasksFromSupabase(team.id)
          } else {
            setNextScreen('team-select')  // オープニング後にチーム選択画面へ
          }
        } else {
          setNextScreen('team-select')  // オープニング後にチーム選択画面へ
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // 認証エラー時の自動クリーンアップ
      await handleAuthError(error)
    }
  }

  // 認証エラー時の自動クリーンアップ
  const handleAuthError = async (error) => {
    try {
      console.log('Cleaning up auth session due to error:', error.message)

      // Supabaseセッションをクリア
      await supabase.auth.signOut()

      // アプリケーション状態をリセット
      setCurrentUser(null)
      setSelectedTeam(null)
      setIsLoggedIn(false)
      setCurrentScreen('cover')

      // Codespaces環境での URL変更を検知
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin

        // Supabaseユーザーメタデータから前回のOriginを取得
        const storedOrigin = currentUser?.user_metadata?.lastOrigin

        if (storedOrigin && storedOrigin !== currentOrigin) {
          console.log('Codespaces URL changed detected, updating user metadata')
          // Supabaseユーザーメタデータを更新
          if (currentUser) {
            supabase.auth.updateUser({
              data: { lastOrigin: currentOrigin }
            }).catch(error => console.log('Origin update failed:', error))
          }
        } else if (currentUser) {
          // 初回設定
          supabase.auth.updateUser({
            data: { lastOrigin: currentOrigin }
          }).catch(error => console.log('Origin initial set failed:', error))
        }
      }

    } catch (cleanupError) {
      console.error('Auth cleanup error:', cleanupError)
    }
  }

  // Codespaces環境チェックとセッション検証
  const validateCodespacesSession = () => {
    if (typeof window === 'undefined') return true

    const isCodespaces = window.location.hostname.includes('github.dev') ||
                        window.location.hostname.includes('codespaces')

    if (isCodespaces) {
      const currentOrigin = window.location.origin
      // Supabaseユーザーメタデータから前回のOriginを取得
      const storedOrigin = currentUser?.user_metadata?.lastOrigin

      if (storedOrigin && storedOrigin !== currentOrigin) {
        console.log('Codespaces URL change detected, forcing re-authentication')
        return false
      }
    }

    return true
  }

  // ユーザープロファイルを更新
  const updateUserProfile = async (userId, profileData) => {
    try {
      // user_profilesテーブルを使用（selected_teamはこちらに保存）
      // まず既存のプロファイルを確認
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId.toString())
        .maybeSingle()

      if (existingProfile) {
        // 既存プロファイルを更新
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', userId.toString())

        if (error) console.error('Profile update error:', error)
      } else {
        // 新規プロファイルを作成
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId.toString(),
            ...profileData
          })

        if (error) console.error('Profile insert error:', error)
      }
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  // Supabaseからパトロールチェックリストを読み込み
  const loadPatrolChecklistsFromSupabase = async () => {
    if (!selectedTeam) return []

    try {
      const { data, error } = await supabase
        .from('patrol_checklists')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('saved_at', { ascending: false })

      if (error) {
        console.error('Patrol checklist load error:', error)
        return []
      }

      // スネークケースをキャメルケースに変換
      const converted = (data || []).map(item => ({
        id: item.id,
        basicInfo: item.basic_info,
        evaluations: item.evaluations,
        comments: item.comments,
        isoItems: item.iso_items,
        totalScore: item.total_score,
        scoreCounts: item.score_counts,
        scoreDifference: item.score_difference,
        lastScore: item.last_score,
        previousScore: item.previous_score,
        savedAt: item.saved_at
      }))

      return converted
    } catch (error) {
      console.error('Patrol checklist load error:', error)
      return []
    }
  }

  // パトロールチェックリストをSupabaseに保存
  const savePatrolChecklistToSupabase = async (checklist) => {
    if (!selectedTeam) return

    try {
      // 既存のチェックリストを確認
      const { data: existingData } = await supabase
        .from('patrol_checklists')
        .select('id')
        .eq('id', checklist.id)
        .single()

      // キャメルケースをスネークケースに変換
      const dataToSave = {
        id: checklist.id,
        basic_info: checklist.basicInfo,
        evaluations: checklist.evaluations,
        comments: checklist.comments,
        iso_items: checklist.isoItems,
        total_score: checklist.totalScore,
        score_counts: checklist.scoreCounts,
        score_difference: checklist.scoreDifference,
        last_score: checklist.lastScore,
        previous_score: checklist.previousScore,
        team_id: selectedTeam.id,
        user_id: currentUser?.id,
        saved_at: checklist.savedAt
      }

      // 既存データがある場合は更新、ない場合は挿入
      if (existingData) {
        const { error } = await supabase
          .from('patrol_checklists')
          .update(dataToSave)
          .eq('id', checklist.id)

        if (error) console.error('Patrol checklist update error:', error)
      } else {
        const { error } = await supabase
          .from('patrol_checklists')
          .insert(dataToSave)

        if (error) console.error('Patrol checklist save error:', error)
      }
    } catch (error) {
      console.error('Patrol checklist save error:', error)
    }
  }

  // tasksが変更されるたびにSupabaseに保存
  const saveTasksToSupabase = async (tasksToSave) => {
    if (!selectedTeam) return

    console.log('💾 Tasks保存開始:', {
      selectedTeam: selectedTeam.id,
      currentUser: currentUser?.id,
      email: currentUser?.email,
      tasksCount: tasksToSave.length
    })

    try {
      // 現在のSupabaseセッションを取得
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.error('🚨 Supabaseセッションが存在しません - 保存中止')
        return
      }

      // 既存のタスクを削除
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('team_id', selectedTeam.id)

      if (deleteError) {
        console.error('🚨 Tasks削除エラー:', deleteError)
        return
      }

      // 新しいタスクを挿入
      if (tasksToSave.length > 0) {
        const { error: insertError } = await supabase.from('tasks').insert(
          tasksToSave.map(task => {
            const { startDate, endDate, teamId, kaizenData, ...rest } = task
            return {
              title: task.title,
              status: task.status,
              category: task.category,
              start_date: startDate || null,
              end_date: endDate || null,
              kaizen_data: kaizenData || {},
              team_id: selectedTeam.id,
              user_id: session.user.id
            }
          })
        )

        if (insertError) {
          console.error('🚨 Tasks挿入エラー:', insertError)
          // エラーが発生した場合、削除したタスクを復元できないので警告
          console.error('⚠️ タスクが削除されたまま保存に失敗しました')
        } else {
          console.log('✅ Tasks保存成功:', tasksToSave.length, '件')
        }
      }
    } catch (error) {
      console.error('🚨 Save tasks error:', error)
    }
  }

  // tasksが変更されたときに自動保存（RLS対応済み）
  // 🚨 重複保存問題のため一時的に無効化
  // 理由: loadTasksFromSupabase後のsetTasks → useEffect発火 → 再保存の無限ループ
  // TODO: 明示的な保存タイミング（タスク作成・編集・削除時）のみに変更
  // useEffect(() => {
  //   if (selectedTeam && tasks.length > 0) {
  //     console.log('💾 Tasks自動保存実行（RLS対応版）')
  //     saveTasksToSupabase(tasks)
  //   }
  // }, [tasks])

  // 活動報告書フォーム画面でのグローバルペーストイベント
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // 活動報告書フォームが表示されている場合のみ処理
      if (!showReportForm) return
      
      const items = e.clipboardData.items
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              // どちらの画像スロットが空いているかチェック
              if (!reportData?.beforeImage) {
                setReportData({...(reportData || {}), beforeImage: event.target.result})
                showToast('Before画像にペーストしました', 'success')
              } else if (!reportData?.afterImage) {
                setReportData({...(reportData || {}), afterImage: event.target.result})
                showToast('After画像にペーストしました', 'success')
              } else {
                showToast('Before画像を上書きしました（両方の画像スロットが埋まっているため）', 'info')
                setReportData({...(reportData || {}), beforeImage: event.target.result})
              }
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    }

    if (showReportForm) {
      document.addEventListener('paste', handleGlobalPaste)
    }

    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [showReportForm, reportData])

  // カテゴリIDから名前とアイコンを取得する関数
  const getCategoryDisplay = (categoryId) => {
    const category = kaizenCategories.find(cat => cat.id === categoryId)
    return category ? `${category.icon} ${category.name}` : categoryId
  }

  // テキストからカテゴリを自動判別する関数
  const detectCategoryFromText = (title = '', problem = '', kaizenContent = '') => {
    const combinedText = `${title} ${problem} ${kaizenContent}`.toLowerCase()
    
    // 各カテゴリのマッチスコアを計算
    const categoryScores = kaizenCategories.map(category => {
      let score = 0
      
      category.keywords.forEach(keyword => {
        // キーワードが含まれている回数を数える（重複も考慮）
        const regex = new RegExp(keyword, 'gi')
        const matches = combinedText.match(regex)
        if (matches) {
          score += matches.length
        }
      })
      
      return { category, score }
    }).filter(item => item.score > 0) // スコア0のものは除外
    
    // スコアでソートして最高点のカテゴリを返す
    if (categoryScores.length > 0) {
      categoryScores.sort((a, b) => b.score - a.score)
      return categoryScores[0].category.id
    }
    
    // マッチするものがない場合は「その他」を返す
    return 'other'
  }

  // 高精度な自動カテゴリ選択関数（自動選択ボタン用）
  const detectBestCategory = (title = '', problem = '', kaizenContent = '') => {
    const combinedText = `${title} ${problem} ${kaizenContent}`.toLowerCase()

    // 各カテゴリのマッチスコアを計算（シンプルな方式）
    const categoryScores = kaizenCategories.map(category => {
      let score = 0
      let matchedKeywords = []

      category.keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi')
        const matches = combinedText.match(regex)
        if (matches) {
          score += matches.length
          matchedKeywords.push(keyword)
        }
      })

      return {
        category,
        score,
        matchedKeywords: [...new Set(matchedKeywords)] // 重複除去
      }
    }).filter(item => item.score > 0)

    if (categoryScores.length === 0) {
      return null // マッチするものがない
    }

    // スコアでソート（降順）
    categoryScores.sort((a, b) => b.score - a.score)

    // デバッグ用ログ
    console.log('🤖 自動選択 - カテゴリスコア:', categoryScores.slice(0, 3).map(s =>
      `${s.category.name}:${s.score}pt (${s.matchedKeywords.join(', ')})`
    ))

    // 最高スコアのカテゴリを返す
    const bestCategory = categoryScores[0]

    return {
      category: bestCategory.category,
      score: bestCategory.score,
      reason: `キーワードマッチ数: ${bestCategory.score}点 (マッチしたキーワード: ${bestCategory.matchedKeywords.slice(0, 5).join(', ')}${bestCategory.matchedKeywords.length > 5 ? '...' : ''})`
    }
  }

  // カテゴリ候補を取得する関数（複数の候補を返す）
  const getCategorySuggestions = (title = '', problem = '', kaizenContent = '') => {
    const combinedText = `${title} ${problem} ${kaizenContent}`.toLowerCase()
    
    const categoryScores = kaizenCategories.map(category => {
      let score = 0
      let matchedKeywords = []
      
      category.keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi')
        const matches = combinedText.match(regex)
        if (matches) {
          score += matches.length
          matchedKeywords.push(keyword)
        }
      })
      
      return { 
        category, 
        score, 
        matchedKeywords: [...new Set(matchedKeywords)] // 重複除去
      }
    }).filter(item => item.score > 0)
    
    // スコアでソート
    categoryScores.sort((a, b) => b.score - a.score)
    
    // 上位3つまでを返す
    return categoryScores.slice(0, 3)
  }

  // フォーム入力時にカテゴリ候補を更新する関数
  const updateCategorySuggestions = (formData) => {
    const suggestions = getCategorySuggestions(formData.title, formData.problem, formData.kaizenContent)
    setCategorySuggestions(suggestions)

    // デバッグ用ログ
    console.log('🔍 カテゴリ候補:', suggestions.map(s => `${s.category.name}:${s.score}pt`))

    // 最初の候補（最高スコア）を自動選択（スコアが十分高い場合）
    if (suggestions.length > 0 && suggestions[0].score >= 2 && !formData.fiveSMethod) {
      console.log('✅ 自動選択:', suggestions[0].category.name, suggestions[0].score + 'pt')
      setKaizenForm(prev => ({
        ...prev,
        fiveSMethod: suggestions[0].category.id
      }))
    }
  }

  // タスク編集を開始する関数
  const startEditTask = (task) => {
    setEditingTask(task)
    setEditTaskForm({
      title: task.title || '',
      personInCharge: task.kaizenData?.personInCharge || '',
      place: task.kaizenData?.place || '',
      fiveSMethod: task.category || '',
      problem: task.kaizenData?.problem || '',
      kaizenContent: task.kaizenData?.kaizenContent || ''
    })
    setShowEditTaskForm(true)
  }

  // タスク編集をキャンセルする関数
  const cancelEditTask = () => {
    setEditingTask(null)
    setEditTaskForm({
      title: '',
      personInCharge: '',
      place: '',
      fiveSMethod: '',
      problem: '',
      kaizenContent: ''
    })
    setShowEditTaskForm(false)
  }

  // タスクを更新する関数
  const updateTask = () => {
    if (!editTaskForm.title.trim()) {
      showToast('タイトルを入力してください', 'warning')
      return
    }

    // カテゴリーの自動振り分けを実行
    const detectedCategory = detectCategoryFromText(editTaskForm.title, editTaskForm.problem, editTaskForm.kaizenContent)
    const autoSelectedCategory = detectedCategory ? detectedCategory.id : 'other'
    
    // 手動選択されたカテゴリーがあればそれを優先、なければ自動振り分け結果を使用
    const finalCategory = editTaskForm.fiveSMethod || autoSelectedCategory

    setTasks(tasks.map(task => {
      if (task.id === editingTask.id) {
        return {
          ...task,
          title: editTaskForm.title.trim(),
          category: finalCategory,
          kaizenData: {
            ...task.kaizenData,
            personInCharge: editTaskForm.personInCharge.trim(),
            place: editTaskForm.place.trim(),
            fiveSMethod: finalCategory,
            problem: editTaskForm.problem.trim(),
            kaizenContent: editTaskForm.kaizenContent.trim()
          }
        }
      }
      return task
    }))

    cancelEditTask()
  }

  

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const statusOrder = ["todo", "in-progress", "completed"]
        const currentIndex = statusOrder.indexOf(task.status)
        const nextIndex = (currentIndex + 1) % statusOrder.length
        return { ...task, status: statusOrder[nextIndex] }
      }
      return task
    }))
  }

  // 完了タスクを進行中に戻す専用関数
  const moveTaskToInProgress = async (id) => {
    // ローカルステートを更新
    setTasks(tasks.map(task => {
      if (task.id === id) {
        return { ...task, status: "in-progress" }
      }
      return task
    }))

    // Supabaseにも保存
    const taskToUpdate = tasks.find(task => task.id === id)
    if (taskToUpdate && selectedTeam) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'in-progress' })
          .eq('id', id)
          .eq('team_id', selectedTeam.id)

        if (error) {
          console.error('タスクステータス更新エラー:', error)
          showToast('タスクステータスの更新に失敗しました', 'error')
        } else {
          console.log('✅ タスクを進行中に戻しました')
          showToast('タスクを進行中に戻しました', 'success')
        }
      } catch (error) {
        console.error('タスクステータス更新エラー:', error)
        showToast('タスクステータスの更新に失敗しました', 'error')
      }
    }
  }

  const deleteTask = async (id) => {
    // 削除対象のタスクを取得
    const taskToDelete = tasks.find(task => task.id === id)

    // 完了タスクで報告書データがある場合、アーカイブに移動
    if (taskToDelete && taskToDelete.status === 'completed' && taskToDelete.kaizenData) {
      setArchivedReports(prev => [...prev, {
        ...taskToDelete,
        archivedAt: new Date().toISOString()
      }])
    }

    // Supabaseから削除
    if (selectedTeam) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('team_id', selectedTeam.id)

      if (error) {
        console.error('❌ タスク削除エラー:', error)
        showToast('タスクの削除に失敗しました', 'error')
        return
      }
      console.log('🗑️ タスク削除完了:', id)
    }

    // ローカルステートからタスクを削除
    setTasks(tasks.filter(task => task.id !== id))
  }

  const handleStartTask = (taskId) => {
    setSelectedTaskId(taskId)
    setShowDateModal(true)
  }

  const handleDateSubmit = async () => {
    if (dateRange.startDate && dateRange.endDate) {
      // 🔧 Supabaseに保存
      if (selectedTeam && selectedTaskId) {
        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'in-progress',
            start_date: dateRange.startDate,
            end_date: dateRange.endDate
          })
          .eq('id', selectedTaskId)
          .eq('team_id', selectedTeam.id)

        if (error) {
          console.error('❌ タスク開始エラー:', error)
          showToast('タスクの開始に失敗しました', 'error')
          return
        }
        console.log('✅ タスク開始完了:', selectedTaskId)
      }

      // ローカルステートを更新
      setTasks(tasks.map(task => {
        if (task.id === selectedTaskId) {
          return {
            ...task,
            status: "in-progress",
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        }
        return task
      }))
      setShowDateModal(false)
      setDateRange({ startDate: '', endDate: '' })
      setSelectedTaskId(null)
    }
  }

  // カスタム認証: パスワードハッシュ化関数
  const hashPassword = (password) => {
    // シンプルなハッシュ化（本格運用時はbcryptなど使用）
    return btoa(password + 'mkg-salt-2024')
  }

  // ログイン関数（Supabase Auth統一）
    const handleLogin = async (username, password) => {
      try {
        console.log('🔑 Supabase Auth ログイン開始:', username)

        const email = `${username.replace(/\s+/g, '.')}@example.com`

        // Supabase Authでログイン
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })

        if (authError || !authData.user) {
          console.error('Supabase Auth ログインエラー:', authError)
          showToast('名前またはパスワードが正しくありません', 'error')
          return false
        }

        console.log('✅ Supabase Auth ログイン成功:', authData.user.id)

        // custom_usersからチーム情報を取得
        const { data: customUserData } = await supabase
          .from('custom_users')
          .select('*')
          .eq('username', username)
          .maybeSingle()

        // ユーザー情報をセット
        const user = {
          id: authData.user.id,
          email: authData.user.email,
          username: username,
          user_metadata: {
            display_name: customUserData?.display_name || authData.user.user_metadata?.display_name || username,
            teams: customUserData?.teams || authData.user.user_metadata?.teams || []
          }
        }

        setCurrentUser(user)
        setUserTeams(user.user_metadata.teams)
        setIsLoggedIn(true)
        setCurrentScreen('team-select')
        return true

      } catch (error) {
        console.error('Login error:', error)
        showToast('ログイン中にエラーが発生しました', 'error')
        return false
      }
    }

  const handleRegister = async () => {
    const { username, password, confirmPassword, selectedTeams } = registerData

    // バリデーション
    if (!username || !password || selectedTeams.length === 0) {
      setRegisterError('すべての項目を入力し、少なくとも1つのチームを選択してください')
      return false
    }

    // ユーザー名の形式チェック（英字とスペースのみ）
    const usernameRegex = /^[a-zA-Z\s]+$/
    if (!usernameRegex.test(username)) {
      setRegisterError('名前は英字とスペースのみ使用できます')
      showToast('名前は英字とスペースのみ使用できます', 'error')
      return false
    }

    if (password !== confirmPassword) {
      setRegisterError('パスワードが一致しません')
      return false
    }

    try {
      console.log('📝 Supabase Auth ユーザー登録開始:', username)

      const email = `${username.replace(/\s+/g, '.')}@example.com`

      // Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            display_name: username,
            teams: selectedTeams
          }
        }
      })

      if (authError) {
        console.error('Supabase Auth 登録エラー:', authError)
        if (authError.message.includes('already registered')) {
          setRegisterError('この名前は既に登録されています')
          showToast('この名前は既に登録されています', 'error')
        } else {
          setRegisterError('登録に失敗しました: ' + authError.message)
          showToast('登録に失敗しました: ' + authError.message, 'error')
        }
        return false
      }

      if (!authData.user) {
        setRegisterError('ユーザー作成に失敗しました')
        showToast('ユーザー作成に失敗しました', 'error')
        return false
      }

      console.log('✅ Supabase Auth 登録成功:', authData.user.id)

      // custom_usersテーブルにも保存（チーム情報の管理用）
      const { error: customError } = await supabase
        .from('custom_users')
        .insert({
          id: authData.user.id,
          username: username,
          display_name: username,
          teams: selectedTeams,
          created_at: new Date().toISOString()
        })

      if (customError) {
        console.warn('custom_usersへの保存失敗（続行）:', customError)
      }

      // ユーザー情報をセット
      const user = {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: {
          display_name: username,
          teams: selectedTeams
        }
      }

      setCurrentUser(user)
      setUserTeams(selectedTeams)
      setIsLoggedIn(true)
      setCurrentScreen('team-select')
      showToast(`ユーザー登録が完了しました（${username}）`, 'success')
      setRegisterData({
        username: '',
        password: '',
        confirmPassword: '',
        selectedTeams: []
      })
      setRegisterError('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      showToast(`ユーザー登録が完了しました（${username}）`, 'success')
      return true

    } catch (error) {
      console.error('Registration error:', error)
      setRegisterError('登録処理中にエラーが発生しました')
      return false
    }
  }

  const handleTeamSelect = async (team) => {
    setSelectedTeam(team)
    setTeamName(team.id)

    // チーム選択と権限情報をSupabaseのauth user_metadataで管理
    const currentTeams = currentUser?.user_metadata?.teams || []
    const updatedTeams = currentTeams.includes(team.id) ? currentTeams : [...currentTeams, team.id]

    await supabase.auth.updateUser({
      data: {
        last_team_id: team.id,
        teams: updatedTeams
      }
    })
    console.log('✅ チーム選択保存:', team.id, 'teams:', updatedTeams)
    setIsLoggedIn(true)
    setCurrentScreen('main')

    // 🔧 チーム切り替え時に必ずタスクをロード
    await loadTasksFromSupabase(team.id)

    // 成功時にCodespacesのURL情報をSupabaseに記録
    if (typeof window !== 'undefined' && currentUser) {
      supabase.auth.updateUser({
        data: { lastOrigin: window.location.origin }
      }).catch(error => console.log('Origin update failed:', error))
    }
  }

  const handleLogout = async () => {
    setCurrentUser(null)
    setSelectedTeam(null)
    setIsLoggedIn(false)
    setCurrentScreen('cover')
    setShowLoginPassword(false)
    // 🔧 ログアウト時にタスクをクリア
    setTasks([])
    // Supabaseからログアウト
    await supabase.auth.signOut()

    // Supabase認証管理によりsessionStorage不要
  }

  // ユーザーの所属チーム情報を取得
  const loadUserTeams = async (username) => {
    try {
      const { data: customUserData } = await supabase
        .from('custom_users')
        .select('teams')
        .eq('username', username)
        .single()

      if (customUserData?.teams) {
        setUserTeams(customUserData.teams)
        console.log('✅ ユーザー所属チーム取得:', customUserData.teams)
        return customUserData.teams
      } else {
        console.log('⚠️ custom_usersにチーム情報なし')
        setUserTeams([])
        return []
      }
    } catch (error) {
      console.error('❌ ユーザーチーム取得エラー:', error)
      setUserTeams([])
      return []
    }
  }

  // 権限チェック
  const canEdit = () => {
    return currentUser && selectedTeam && (
      currentUser.user_metadata?.teams?.includes(selectedTeam.id) ||
      userTeams.includes(selectedTeam.id)
    )
  }

  // チーム用のタスクフィルタリング
  const getTeamTasks = () => {
    if (!selectedTeam) return []
    return tasks.filter(task => task.teamId === selectedTeam.id)
  }

  // チーム別番号管理ヘルパー関数（LocalStorage対応）
  const getTeamNumbers = async (teamId, yearMonth) => {
    try {
      const { data, error } = await supabase
        .from('team_numbers')
        .select('current_number')
        .eq('team_id', teamId)
        .eq('year_month', yearMonth)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('getTeamNumbers error:', error)
        return null
      }

      return data?.current_number || null
    } catch (error) {
      console.error('getTeamNumbers exception:', error)
      return null
    }
  }

  const saveTeamNumber = async (teamId, yearMonth, currentNumber) => {
    try {
      const { error } = await supabase
        .from('team_numbers')
        .upsert({
          team_id: teamId,
          year_month: yearMonth,
          current_number: currentNumber,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id,year_month'
        })

      if (error) {
        console.error('saveTeamNumber error:', error)
        return false
      }

      console.log('🔢 saveTeamNumber success (Supabase):', { teamId, yearMonth, currentNumber })
      return true
    } catch (error) {
      console.error('saveTeamNumber exception:', error)
      return false
    }
  }

  const generateKaizenNumber = async () => {
    if (!selectedTeam) return 'TEMP-0000'

    const teamId = selectedTeam.id

    // 現在の年月を取得 (例: 2025年7月 -> 2507)
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2) // 25
    const month = String(now.getMonth() + 1).padStart(2, '0') // 07
    const currentYearMonth = year + month

    console.log('🔢 generateKaizenNumber - teamId:', teamId)
    console.log('🔢 generateKaizenNumber - currentYearMonth:', currentYearMonth)

    // Supabaseから現在の番号を取得
    const currentNumber = await getTeamNumbers(teamId, currentYearMonth)
    console.log('🔢 generateKaizenNumber - currentNumber from DB:', currentNumber)

    // チームが初回使用の場合、手入力モーダルを表示
    if (currentNumber === null) {
      console.log('🔢 generateKaizenNumber - 初回使用、モーダル表示')
      setShowNumberSetupModal(true)
      return null // モーダル表示中は番号生成を保留
    }

    // 既存の年月の場合、現在の番号を使用し、次回のために+1保存
    const useNumber = currentNumber
    const nextNumber = currentNumber + 1
    console.log('🔢 generateKaizenNumber - currentNumber:', currentNumber, '-> useNumber:', useNumber, '-> nextNumber for save:', nextNumber)

    // LocalStorageに次回用の番号を保存
    const saveSuccess = await saveTeamNumber(teamId, currentYearMonth, nextNumber)
    if (!saveSuccess) {
      console.error('🔢 generateKaizenNumber - 番号保存失敗')
      return 'ERROR-SAVE-FAILED'
    }

    const formattedNumber = String(useNumber).padStart(4, '0')
    const generatedNumber = `${teamId}-${currentYearMonth}-${formattedNumber}`
    console.log('🔢 generateKaizenNumber - generated:', generatedNumber)

    return generatedNumber
  }

  // Claude.ai直接利用方式（無料）- API通信なし

  // Claude.ai直接利用による相談処理（無料方式）
  const handleAiConsultation = async () => {
    console.log('🤖 Claude.ai直接相談処理開始')
    console.log('入力テキスト:', aiConsultation.inputText)

    if (!aiConsultation.inputText.trim()) {
      console.log('❌ 入力テキストが空です')
      showToast('相談内容を入力してください。', 'warning')
      return
    }

    const userMessage = aiConsultation.inputText
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleString('ja-JP')
    }

    // ユーザーメッセージを追加
    setAiConsultation(prev => ({
      ...prev,
      messages: [...prev.messages, newUserMessage],
      inputText: ''
    }))

    // Claude APIに送信
    console.log('🚀 Claude APIに送信中...')
    const aiResponse = await sendToClaude(userMessage)

    if (aiResponse) {
      console.log('✅ AI応答受信成功')
      const newAiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toLocaleString('ja-JP')
      }

      setAiConsultation(prev => ({
        ...prev,
        messages: [...prev.messages, newAiMessage]
      }))

      // チャット履歴をSupabaseに保存（オプション）
      try {
        await supabase
          .from('ai_consultations')
          .insert({
            user_id: currentUser?.id,
            team_id: selectedTeam?.id,
            user_message: userMessage,
            ai_response: aiResponse,
            created_at: new Date().toISOString()
          })
      } catch (error) {
        console.log('チャット履歴保存エラー（動作継続）:', error)
      }
    } else {
      console.log('❌ AI応答の取得に失敗')
    }
  }

  // テンプレート適用
  const applyTemplate = (template) => {
    setAiConsultation(prev => ({
      ...prev,
      inputText: template
    }))
  }

  // 無料Claude.ai直接利用方式 - APIキー不要

  // 管理者専用：社員一覧を取得
  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('email')

      if (!error) {
        setAdminSettings(prev => ({
          ...prev,
          employees: data || []
        }))
      }
    } catch (error) {
      console.log('社員一覧取得エラー:', error)
    }
  }


  // 無料方式 - APIキー管理不要

  // 無料Claude.ai直接利用方式 - APIキー設定不要

  const handleInitialNumberSetup = async () => {
    console.log('🔢 handleInitialNumberSetup 開始')
    console.log('selectedTeam:', selectedTeam)
    console.log('initialNumberInput:', initialNumberInput)

    if (!selectedTeam || !initialNumberInput.trim()) {
      console.log('❌ 必要な値が不足')
      return
    }

    // 入力形式のバリデーション (例: GR-2507-0360)
    const numberPattern = /^([A-Z]{2})-(\d{4})-(\d{4})$/
    const match = initialNumberInput.match(numberPattern)
    console.log('🔍 パターンマッチ結果:', match)

    if (!match) {
      showToast('番号の形式が正しくありません。例: GR-2507-0360', 'error')
      return
    }

    const [, inputTeamId, inputYearMonth, inputNumber] = match

    if (inputTeamId !== selectedTeam.id) {
      showToast(`チームIDが一致しません。${selectedTeam.id}で始まる番号を入力してください。`, 'error')
      return
    }

    // Supabaseに初期番号を保存
    console.log('💾 保存開始:', { teamId: selectedTeam.id, yearMonth: inputYearMonth, number: parseInt(inputNumber, 10) })
    const saveSuccess = await saveTeamNumber(selectedTeam.id, inputYearMonth, parseInt(inputNumber, 10))
    console.log('💾 保存結果:', saveSuccess)

    if (!saveSuccess) {
      showToast('番号の保存に失敗しました。もう一度お試しください。', 'error')
      return
    }

    console.log('✅ 設定完了 - モーダルを閉じます')
    setShowNumberSetupModal(false)
    setInitialNumberInput('')

    // 🔧 番号設定後、タスクを再ロードしてから中断された処理を再実行
    if (selectedTaskId) {
      console.log('🔄 タスク再ロード後、handleTaskComplete再実行')
      await loadTasksFromSupabase(selectedTeam.id)
      // タスク再ロード後に少し待ってから実行
      setTimeout(() => {
        console.log('▶️ handleTaskComplete再実行:', selectedTaskId)
        handleTaskComplete(selectedTaskId)
        setSelectedTaskId(null)
      }, 200)
    }
  }

  // 使用量監視機能：データベースサイズ取得
  const checkDatabaseUsage = async () => {
    setUsageLoading(true)
    try {
      // データベースサイズを取得
      const { data: dbSizeData, error: dbError } = await supabase.rpc('get_database_size')

      if (dbError) {
        console.error('DB使用量取得エラー:', dbError)
        // フォールバック：テーブルサイズを個別に取得
        const { data: tablesData, error: tablesError } = await supabase.rpc('get_table_sizes')
        if (tablesError) {
          throw new Error('使用量の取得に失敗しました')
        }

        const totalSize = tablesData.reduce((sum, table) => sum + parseInt(table.size_bytes), 0)
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)
        setDatabaseUsage({
          totalSize: totalSize,
          totalSizeMB: totalSizeMB,
          usedSize: `${totalSizeMB} MB`,
          usagePercent: ((totalSize / (500 * 1024 * 1024)) * 100).toFixed(1),
          tables: tablesData,
          warning: totalSize > (500 * 1024 * 1024 * 0.8) // 80%警告
        })
      } else {
        const sizeBytes = dbSizeData[0]?.database_size || 0
        const totalSizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)
        setDatabaseUsage({
          totalSize: sizeBytes,
          totalSizeMB: totalSizeMB,
          usedSize: `${totalSizeMB} MB`,
          usagePercent: ((sizeBytes / (500 * 1024 * 1024)) * 100).toFixed(1),
          warning: sizeBytes > (500 * 1024 * 1024 * 0.8) // 80%警告
        })
      }
    } catch (error) {
      console.error('使用量確認エラー:', error)
      // エラー時は簡易計算
      try {
        const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
        const { count: usersCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
        const { count: numbersCount } = await supabase.from('team_numbers').select('*', { count: 'exact', head: true })

        // 概算計算（1レコード約1KB）
        const estimatedSize = (tasksCount + usersCount + numbersCount) * 1024
        const totalSizeMB = (estimatedSize / (1024 * 1024)).toFixed(2)
        setDatabaseUsage({
          totalSize: estimatedSize,
          totalSizeMB: totalSizeMB,
          usedSize: `${totalSizeMB} MB`,
          usagePercent: ((estimatedSize / (500 * 1024 * 1024)) * 100).toFixed(1),
          estimated: true,
          recordCount: tasksCount + usersCount + numbersCount,
          warning: estimatedSize > (500 * 1024 * 1024 * 0.8)
        })
      } catch (fallbackError) {
        console.error('簡易計算も失敗:', fallbackError)
        setDatabaseUsage({ error: 'データベース使用量を取得できませんでした' })
      }
    }
    setUsageLoading(false)
  }

  // 管理機能：データリセット
  const resetAllData = async () => {
    if (!selectedTeam) {
      showToast('⚠️ チームを選択してください', 'warning')
      return
    }

    if (confirm('⚠️ 注意：現在のチームのすべてのタスクとカイゼン番号がリセットされます。本当に実行しますか？')) {
      try {
        console.log('🗑️ データリセット開始:', selectedTeam.id)

        // 1. Supabaseのタスクを削除
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('team_id', selectedTeam.id)

        if (tasksError) {
          console.error('❌ タスク削除エラー:', tasksError)
          showToast('❌ タスク削除に失敗しました: ' + tasksError.message, 'error')
          return
        }

        // 2. Supabaseのカイゼン番号をクリア
        const { error: numbersError } = await supabase
          .from('team_numbers')
          .delete()
          .eq('team_id', selectedTeam.id)

        if (numbersError) {
          console.error('❌ 番号削除エラー:', numbersError)
        }

        // 3. ローカル状態をクリア
        setTasks([])

        console.log('✅ データリセット完了')
        showToast('✅ データリセット完了しました。', 'success')
      } catch (error) {
        console.error('❌ データリセットエラー:', error)
        showToast('❌ データリセットに失敗しました: ' + error.message, 'error')
      }
    }
  }

  // パトロールチェック評価更新関数
  const updatePatrolEvaluation = (itemNo, score) => {
    setPatrolData(prev => {
      const newEvaluations = { ...prev.evaluations }
      const parsedScore = parseInt(score)

      // 同じ点数を再度クリックした場合は解除
      if (newEvaluations[itemNo] === parsedScore) {
        delete newEvaluations[itemNo]
      } else {
        newEvaluations[itemNo] = parsedScore
      }

      // 合計点数と内訳を再計算
      const newScoreCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      let totalScore = 0

      Object.values(newEvaluations).forEach(value => {
        if (value >= 1 && value <= 5) {
          newScoreCounts[value]++
          totalScore += value
        }
      })

      return {
        ...prev,
        evaluations: newEvaluations,
        totalScore,
        scoreCounts: newScoreCounts
      }
    })
  }

  // パトロールチェックコメント更新関数
  const updatePatrolComment = (itemNo, comment) => {
    // 文字数制限: 794文字まで
    const limitedComment = comment.length > 794 ? comment.slice(0, 794) : comment
    setPatrolData(prev => ({
      ...prev,
      comments: {
        ...prev.comments,
        [itemNo]: limitedComment
      }
    }))
  }

  // ISO項目更新関数
  const updatePatrolISOItem = (index, field, value) => {
    setPatrolData(prev => ({
      ...prev,
      isoItems: {
        ...prev.isoItems,
        [index]: {
          ...prev.isoItems[index],
          [field]: value
        }
      }
    }))
  }

  // ISO9001監査欄の画像コピー機能
  const copyISOItemsToClipboard = async () => {
    if (!isoSectionRef.current) {
      showToast('コピー対象が見つかりません', 'error')
      return
    }

    try {
      // html2canvasで要素を画像化
      const canvas = await html2canvas(isoSectionRef.current, {
        backgroundColor: '#f0f0ff',
        scale: 2, // 高解像度化
        logging: false
      })

      // canvasをblobに変換
      canvas.toBlob(async (blob) => {
        try {
          // クリップボードに画像をコピー
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ])
          showToast('ISO9001監査欄を画像としてコピーしました', 'success')
        } catch (error) {
          console.error('クリップボードコピーエラー:', error)
          showToast('コピーに失敗しました。ブラウザがクリップボードAPIに対応していない可能性があります。', 'error')
        }
      }, 'image/png')
    } catch (error) {
      console.error('画像生成エラー:', error)
      showToast('画像の生成に失敗しました', 'error')
    }
  }

  // 基本情報更新関数
  const updatePatrolBasicInfo = (field, value) => {
    setPatrolData(prev => {
      const newBasicInfo = {
        ...prev.basicInfo,
        [field]: value
      }

      // 開始時間と終了時間が両方入力されている場合、所要時間を自動計算
      if (newBasicInfo.startTime && newBasicInfo.endTime) {
        try {
          // 全角コロンを半角に変換
          const normalizedStartTime = newBasicInfo.startTime.trim().replace(/：/g, ':')
          const normalizedEndTime = newBasicInfo.endTime.trim().replace(/：/g, ':')

          // 手入力の時間形式を検証（HH:mm または H:mm）
          const timeRegex = /^(\d{1,2}):(\d{2})$/
          const startMatch = normalizedStartTime.match(timeRegex)
          const endMatch = normalizedEndTime.match(timeRegex)

          console.log('時間計算開始:', {
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            startMatch,
            endMatch
          })

          if (startMatch && endMatch) {
            const startHour = parseInt(startMatch[1], 10)
            const startMin = parseInt(startMatch[2], 10)
            const endHour = parseInt(endMatch[1], 10)
            const endMin = parseInt(endMatch[2], 10)

            console.log('時間パース結果:', { startHour, startMin, endHour, endMin })

            // 時間と分が有効な範囲かチェック
            if (startHour >= 0 && startHour < 24 && startMin >= 0 && startMin < 60 &&
                endHour >= 0 && endHour < 24 && endMin >= 0 && endMin < 60) {
              // 分単位で計算
              const startTotalMin = startHour * 60 + startMin
              const endTotalMin = endHour * 60 + endMin
              let diffMinutes = endTotalMin - startTotalMin

              // 終了時間が開始時間より前の場合は翌日とみなす
              if (diffMinutes < 0) {
                diffMinutes += 24 * 60
              }

              console.log('所要時間計算完了:', diffMinutes)
              newBasicInfo.duration = diffMinutes
            }
          } else {
            console.log('時間形式が不正')
          }
        } catch (error) {
          console.error('時間計算エラー:', error)
        }
      }

      return {
        ...prev,
        basicInfo: newBasicInfo
      }
    })
  }

  // 前回点数の取得と点差計算
  const calculateScoreDifference = (currentScore, teamId, auditDate, lastScore = null) => {
    if (!teamId) {
      return 0
    }

    // 初回監査で手入力の前回点数がある場合はそれを優先
    const inputLastScore = lastScore !== null && lastScore !== undefined ? lastScore : patrolData.lastScore
    if (inputLastScore !== null && inputLastScore !== undefined) {
      return currentScore - inputLastScore
    }

    // 保存済みのチェックリストから前回点数を取得（監査日時がある場合のみ）
    if (auditDate) {
      const checklists = savedPatrolChecklists
      const teamChecklists = checklists
        .filter(item => item.basicInfo.auditedTeam === teamId)
        .sort((a, b) => new Date(b.basicInfo.auditDate) - new Date(a.basicInfo.auditDate))

      if (teamChecklists.length > 0) {
        const lastScore = teamChecklists[0].totalScore
        return currentScore - lastScore
      }
    }

    return 0
  }

  // 前回点数の手入力更新
  const updateLastScore = (score) => {
    const parsedScore = score && score !== '' ? parseInt(score) : null
    setPatrolData(prev => ({
      ...prev,
      lastScore: parsedScore
    }))
  }

  // チームが初回監査かどうかを判定
  const isFirstAudit = (teamId) => {
    if (!teamId) return false
    const checklists = savedPatrolChecklists
    return checklists.filter(item => item.basicInfo.auditedTeam === teamId).length === 0
  }

  // 既存のチーム名一覧を取得
  const getExistingTeams = () => {
    const checklists = savedPatrolChecklists
    const teams = [...new Set(checklists.map(item => item.basicInfo.auditedTeam))]
    return teams.filter(team => team && team.trim() !== '')
  }

  // 初回作成かどうかを判定（全体で初回かどうか）
  const isFirstTimeCreation = () => {
    const checklists = savedPatrolChecklists
    return checklists.length === 0
  }

  // A4印刷用のパトロールチェックシート生成関数（入力フォーム準拠デザイン）
  const generatePrintablePatrolSheet = () => {
    const currentDate = new Date().toLocaleDateString('ja-JP')

    // 入力フォームと同じデータを使用
    const checkItems = [
      { category: "整理", no: 1, content: "管理箇所全体に整理が行われているか（重複するもの、余計な物はないか）" },
      { category: "整頓", no: 2, content: "定置され、収納表記はされているか（探しにくさ・使いづらさ・紛らわしさはないか）" },
      { category: "清掃", no: 3, content: "清掃ルールを守り、月・週・日常清掃など全員で分担し実行されているか" },
      { category: "清潔", no: 4, content: "整理・整頓・清掃は計画的に実施されているか" },
      { category: "躾", no: 5, content: "職場ミーティングの実施・継続はされているか" },
      { category: "躾", no: 6, content: "職場ルールの認識、実施、見直しはされているか" },
      { category: "躾", no: 7, content: "掲示物への記入や更新はされているか" },
      { category: "カイゼン", no: 8, content: "パトロールでの指摘あればカイゼン活動に盛り込んでいるか" },
      { category: "カイゼン", no: 9, content: "カイゼン活動は展開表のスケジュール通り進んでいるか" },
      { category: "カイゼン", no: 10, content: "改善報告はLINE WORKSに投稿されているか（3か月以内）", subContent: "5：前回監査から1ヶ月以内に投稿されている　4：3か月以内に投稿されている 3：期間内に投稿無し　2：3が続いている　1：進歩が見られない" }
    ]

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MKG パトロールチェックシート</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 9px;
      line-height: 1.3;
      margin: 0;
      padding: 10px;
      color: #000;
      background: white;
    }

    .grid-container {
      display: grid;
      grid-template-columns: 40px 40px 4.5fr 30px 30px 30px 30px 30px 5.5fr;
      gap: 3px;
    }

    .grid-item {
      padding: 3px;
      border: 1px solid #ddd;
    }

    .header {
      background-color: #f8f9fa;
      font-weight: bold;
      text-align: center;
      font-size: 10px;
    }

    .sub-header {
      background-color: #e7f1ff;
      font-weight: bold;
      text-align: center;
      font-size: 10px;
    }

    .category {
      text-align: center;
      font-weight: bold;
      color: #28a745;
      background-color: #f8f9fa;
    }

    .category-kaizen {
      color: #dc3545;
    }

    .no {
      text-align: center;
      font-weight: bold;
      background-color: #f8f9fa;
    }

    .content {
      text-align: left;
      background-color: white;
      font-size: 9px;
    }

    .checkbox {
      text-align: center;
      background-color: white;
    }

    .checkbox-selected {
      background-color: #007bff;
      color: white;
      font-weight: bold;
    }

    .comment {
      text-align: left;
      background-color: white;
      font-size: 8px;
    }

    .title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 10px;
    }

    .basic-info {
      margin-bottom: 8px;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="title">✅ MKG パトロールチェックシート</div>

  <div class="basic-info">
    <strong>被監査チーム:</strong> ${patrolData?.basicInfo?.auditedTeam || '未設定'} |
    <strong>監査日:</strong> ${patrolData?.basicInfo?.auditDate || '未設定'} |
    <strong>合計点:</strong> ${patrolData?.totalScore || 0}点
  </div>

  <!-- ヘッダー行 -->
  <div class="grid-container">
    <div class="grid-item header">項目</div>
    <div class="grid-item header">No.</div>
    <div class="grid-item header">詳細・内容</div>
    <div class="grid-item header" style="grid-column: span 5;">評価点</div>
    <div class="grid-item header">【項目別評価コメント・カイゼン提案記入欄】</div>
  </div>

  <!-- サブヘッダー行 -->
  <div class="grid-container">
    <div class="grid-item"></div>
    <div class="grid-item"></div>
    <div class="grid-item"></div>
    <div class="grid-item sub-header">5</div>
    <div class="grid-item sub-header">4</div>
    <div class="grid-item sub-header">3</div>
    <div class="grid-item sub-header">2</div>
    <div class="grid-item sub-header">1</div>
    <div class="grid-item"></div>
  </div>

  <!-- チェック項目 -->
  ${checkItems.map((item, index) => {
    const evaluation = patrolData?.evaluations?.[item.no];
    const comment = patrolData?.comments?.[item.no] || '';
    const isKaizen = item.category === "カイゼン";

    return `
  <div class="grid-container">
    <div class="grid-item category ${isKaizen ? 'category-kaizen' : ''}">${item.category}</div>
    <div class="grid-item no">${item.no}</div>
    <div class="grid-item content">
      ${item.content}
      ${item.subContent ? `<br><span style="font-size: 7px;">${item.subContent}</span>` : ''}
    </div>
    ${[5, 4, 3, 2, 1].map(point => `
    <div class="grid-item checkbox ${evaluation === point ? 'checkbox-selected' : ''}">${evaluation === point ? '✓' : ''}</div>
    `).join('')}
    <div class="grid-item comment">${comment}</div>
  </div>
    `;
  }).join('')}

  <!-- 合計表示 -->
  <div style="margin-top: 10px; padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">
    <strong>合計:</strong> ${patrolData?.totalScore || 0}点 |
    <strong>5点:</strong> ${patrolData?.scoreCounts?.[5] || 0}個
    <strong>4点:</strong> ${patrolData?.scoreCounts?.[4] || 0}個
    <strong>3点:</strong> ${patrolData?.scoreCounts?.[3] || 0}個
    <strong>2点:</strong> ${patrolData?.scoreCounts?.[2] || 0}個
    <strong>1点:</strong> ${patrolData?.scoreCounts?.[1] || 0}個
  </div>
</body>
</html>`
  }

  // パトロールチェックリスト保存関数
  const savePatrolChecklist = async () => {
    if (!patrolData.basicInfo.auditedTeam || !patrolData.basicInfo.auditDate) {
      showToast('監査チーム名と監査日は必須です', 'warning')
      return
    }

    const scoreDifference = calculateScoreDifference(
      patrolData.totalScore,
      patrolData.basicInfo.auditedTeam,
      patrolData.basicInfo.auditDate
    )

    const isFirst = isFirstAudit(patrolData.basicInfo.auditedTeam)

    // 編集中かどうかを判定
    const isEditing = !!patrolData.editingId
    const checklistId = isEditing ? patrolData.editingId : Date.now()

    const checklistData = {
      ...patrolData,
      id: checklistId,
      savedAt: new Date().toISOString(),
      scoreDifference: scoreDifference,
      // 初回監査の場合は手入力した前回点数も保存
      previousScore: isFirst ? patrolData.lastScore : null,
      editingId: undefined  // editingIdは保存しない
    }

    // Supabaseへの保存を先に実行
    await savePatrolChecklistToSupabase(checklistData)

    // 保存後、最新のデータをSupabaseから再取得
    const updatedChecklists = await loadPatrolChecklistsFromSupabase()

    // ローカルステートを更新
    setSavedPatrolChecklists(updatedChecklists)

    // トースト表示
    if (isEditing) {
      showToast('✅ パトロールチェックリストを更新しました', 'success')
    } else {
      showToast('✅ パトロールチェックリストを保存しました', 'success')
    }

    // フォームをクリア
    setPatrolData({
      evaluations: {},
      comments: {},
      totalScore: 0,
      scoreCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      basicInfo: {
        auditedTeam: '',
        auditedApprover: '',
        auditedPerson: '',
        auditorTeam: '',
        auditorApprover: '',
        auditorPerson: '',
        auditDate: '',
        startTime: '',
        endTime: '',
        duration: 0
      },
      lastScore: null,
      scoreDifference: 0,
      editingId: undefined  // editingIdもクリア
    })
  }

  // Supabaseから報告書を読み込む関数
  const loadActivityReportsFromSupabase = async () => {
    if (!selectedTeam) return []

    try {
      const { data, error } = await supabase
        .from('completed_reports')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ 報告書読み込みエラー:', error)
        return []
      }

      // Supabaseのデータをローカル形式に変換
      const reports = data.map(report => ({
        id: `report_${report.task_id}_${new Date(report.created_at).getTime()}`,
        originalTaskId: report.task_id,
        title: report.title,
        kaizenNumber: report.report_data?.kaizenNumber,
        reportNumber: report.report_number, // 📊 改善ナンバー追加
        teamId: report.team_id,
        teamName: selectedTeam?.name,
        reportData: report.report_data,
        createdAt: report.created_at,
        isIndependentCopy: true,
        isDraft: report.is_draft || false // 下書きフラグを追加
      }))

      console.log('✅ 報告書読み込み完了:', reports.length, '件')
      return reports
    } catch (error) {
      console.error('❌ 報告書読み込みエラー:', error)
      return []
    }
  }

  // 初期読み込み時にSupabaseからデータを読み込み
  useEffect(() => {
    if (!selectedTeam) return  // チームが選択されていない場合は読み込まない

    const loadData = async () => {
      const savedChecklists = await loadPatrolChecklistsFromSupabase()
      setSavedPatrolChecklists(savedChecklists)

      const savedReports = await loadActivityReportsFromSupabase()
      setCompletedReports(savedReports)
    }
    loadData()
  }, [selectedTeam])

  const handleKaizenFormSubmit = async () => {
    if (kaizenForm.title.trim()) {
      const newTask = {
        id: Date.now(),
        title: kaizenForm.title,
        status: "todo",
        category: kaizenForm.fiveSMethod || "seiri",
        teamId: selectedTeam?.id,
        kaizenData: {
          ...kaizenForm,
          teamName: selectedTeam?.name
          // kaizenNumber は活動報告書作成時に設定
        }
      }

      // 🚀 Phase 3.1: 安全なSupabaseクラウド保存
      try {
        // kaizen_plansテーブルに保存
        const { data, error } = await supabase
          .from('kaizen_plans')
          .insert({
            title: kaizenForm.title.trim(),
            current_problem: kaizenForm.problem || '',
            target_goal: kaizenForm.kaizenContent || '',
            team_id: selectedTeam?.id
            // kaizen_number は活動報告書作成時に設定
          })

        if (!error) {
          console.log('✅ kaizen_plans保存成功')
        }

        // 🔧 tasksテーブルにも保存（タスク消失問題対策）
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: kaizenForm.title.trim(),
            status: 'todo',
            category: kaizenForm.fiveSMethod || 'seiri',
            team_id: selectedTeam?.id,
            kaizen_data: {
              ...kaizenForm,
              teamName: selectedTeam?.name
            }
          })

        if (!taskError) {
          console.log('✅ tasks保存成功')
        } else {
          console.error('❌ tasks保存エラー:', taskError)
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase保存失敗、ローカル処理継続:', supabaseError)
      }

      setTasks([...tasks, newTask])
      setKaizenForm({
        title: '',
        personInCharge: '',
        place: '',
        fiveSMethod: '',
        problem: '',
        kaizenContent: ''
      })
      setCategorySuggestions([])
      setShowKaizenForm(false)
    }
  }

  const handleTaskComplete = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    console.log('handleTaskComplete called for task:', task)
    console.log('Task has kaizenData:', !!task?.kaizenData)

    if (task) {
      console.log('Opening activity report form')
      // 元のタスクの状態を記録
      setOriginalTaskStatus(task.status)
      setSelectedKaizenTask(task)

      // カイゼンデータがある場合とない場合に対応
      const kaizenData = task.kaizenData || {}

      // カイゼンナンバーを生成（活動報告書作成時のみ、まだナンバーがない場合）
      let kaizenNumber = kaizenData.kaizenNumber
      let updatedTask = task

      console.log('📊 handleTaskComplete - existing kaizenNumber:', kaizenNumber)

      if (!kaizenNumber) {
        console.log('📊 handleTaskComplete - ナンバー未設定、新規生成開始')
        kaizenNumber = await generateKaizenNumber()
        console.log('📊 handleTaskComplete - generated kaizenNumber:', kaizenNumber)

        // 番号生成が保留された場合（初回設定モーダル表示中）
        if (kaizenNumber === null) {
          console.log('📊 handleTaskComplete - 番号生成保留（モーダル表示）')
          // モーダル完了後にこの関数を再実行するためにtaskIdを記録
          setSelectedTaskId(taskId)
          return
        }

        // 生成された番号をタスクのkaizenDataに保存し、即座に状態を更新
        updatedTask = {
          ...task,
          kaizenData: {
            ...task.kaizenData,
            kaizenNumber: kaizenNumber
          }
        }

        console.log('📊 handleTaskComplete - タスク更新:', updatedTask.kaizenData.kaizenNumber)

        const updatedTasks = tasks.map(t => {
          if (t.id === taskId) {
            return updatedTask
          }
          return t
        })
        setTasks(updatedTasks)
        console.log('📊 handleTaskComplete - tasks配列を更新完了')
      } else {
        console.log('📊 handleTaskComplete - 既存ナンバー使用:', kaizenNumber)
      }

      // 最新のタスクデータを使用してreportDataを設定
      const latestKaizenData = updatedTask.kaizenData || {}

      setReportData({
        title: updatedTask.title,
        kaizenNumber: kaizenNumber,
        team: latestKaizenData.team || '',
        personInCharge: latestKaizenData.personInCharge || '',
        place: latestKaizenData.place || '',
        fiveSMethod: latestKaizenData.fiveSMethod || '',
        period: updatedTask.startDate && updatedTask.endDate ? `${updatedTask.startDate} ～ ${updatedTask.endDate}` : '期間未設定',
        problem: latestKaizenData.problem || '',
        kaizenContent: latestKaizenData.kaizenContent || '',
        kaizenEffect: latestKaizenData.kaizenEffect || '',
        beforeImage: '',
        afterImage: '',
        progressComment: ''
      })
      setReportEditSource('todo')
      setShowReportForm(true)
      // タスクの完了移動は活動報告書作成後に行う
    }
  }

  const updateTaskDates = async (taskId, newStartDate, newEndDate) => {
    // 🔧 Supabaseに保存
    if (selectedTeam) {
      const { error } = await supabase
        .from('tasks')
        .update({
          start_date: newStartDate,
          end_date: newEndDate
        })
        .eq('id', taskId)
        .eq('team_id', selectedTeam.id)

      if (error) {
        console.error('❌ タスク期間更新エラー:', error)
        showToast('タスクの期間更新に失敗しました', 'error')
        return
      }
      console.log('✅ タスク期間更新完了:', taskId, newStartDate, newEndDate)
    }

    // ローカルステート更新
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, startDate: newStartDate, endDate: newEndDate }
      }
      return task
    }))
  }

  const getDatesBetween = (startDate, endDate) => {
    const dates = []
    const currentDate = new Date(startDate)
    const lastDate = new Date(endDate)
    
    while (currentDate <= lastDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return dates
  }

  // カレンダー生成関数（指定した日付ベース）
  const generateCalendar = (date = currentCalendarDate) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // 月初と月末を取得
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // カレンダーの開始日（前月の日曜日から）
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())
    
    // カレンダーの終了日（翌月の土曜日まで）
    const endDate = new Date(lastDay)
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
    
    const calendar = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      calendar.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return { calendar, year, month, firstDay, lastDay }
  }

  // 特定の日にタスクがあるかチェック
  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      // team_id または teamId をチェック（Supabase互換）
      const taskTeamId = task.team_id || task.teamId
      if (!task.startDate || !task.endDate || taskTeamId !== selectedTeam?.id) return false
      return dateStr >= task.startDate && dateStr <= task.endDate
    })
  }

  // カイゼンタスク選択時の処理（handleTaskCompleteと同じ構造）
  const handleKaizenTaskSelect = (taskId) => {
    console.log('handleKaizenTaskSelect called with:', taskId)
    
    if (!taskId) {
      setSelectedKaizenTask(null)
      return
    }

    const task = tasks.find(t => t.id === taskId)
    console.log('Found task:', task)
    
    if (task && task.kaizenData) {
      console.log('Opening modal for task:', task.title)
      // 選択されたタスクの状態を設定
      setOriginalTaskStatus(task.status)
      setSelectedKaizenTask(task)
      
      // 既存の報告書データがあればそれを優先、なければkaizenDataから取得
      const existingReportData = task.kaizenData.reportData || {}
      setReportData({
        title: existingReportData.title || task.title,
        kaizenNumber: existingReportData.kaizenNumber || task.kaizenData.kaizenNumber,
        team: existingReportData.team || task.kaizenData.team || '',
        personInCharge: existingReportData.personInCharge || task.kaizenData.personInCharge || '',
        place: existingReportData.place || task.kaizenData.place || '',
        fiveSMethod: existingReportData.fiveSMethod || task.kaizenData.fiveSMethod || '',
        period: existingReportData.period || (task.startDate && task.endDate ? `${task.startDate} ～ ${task.endDate}` : '期間未設定'),
        problem: existingReportData.problem || task.kaizenData.problem || '',
        kaizenContent: existingReportData.kaizenContent || task.kaizenData.kaizenContent || '',
        kaizenEffect: existingReportData.kaizenEffect || task.kaizenData.kaizenEffect || '',
        beforeImage: existingReportData.beforeImage || task.kaizenData.beforeImage || '',
        afterImage: existingReportData.afterImage || task.kaizenData.afterImage || '',
        progressComment: existingReportData.progressComment || task.kaizenData.progressComment || ''
      })
      
      // handleTaskCompleteと全く同じ方法でモーダルを開く
      setReportEditSource('todo')
      setShowReportForm(true)
      console.log('Modal should be opening now')
    }
  }


  // 文章全体をリライトする関数
  const rewriteSentence = (text, fieldType) => {
    console.log('文章リライト開始:', text)
    
    let rewritten = text
    
    // 製造業特有の表現に変換（正規表現の順序を調整）
    const manufacturingPhrases = [
      // 動作・操作系（より具体的なパターンから先に処理）
      { pattern: /動かしたとき/g, replacement: '稼働させた際' },
      { pattern: /動かすとき/g, replacement: '稼働させる際' },
      { pattern: /動かした/g, replacement: '稼働させた' },
      { pattern: /動かす/g, replacement: '稼働させる' },
      { pattern: /巻き取るとき/g, replacement: '巻取りを行う際' },
      { pattern: /巻き取る時/g, replacement: '巻取りを行う際' },
      { pattern: /巻き取る/g, replacement: '巻取りを行う' },
      { pattern: /持ち上げる/g, replacement: '上昇させる' },
      { pattern: /回る/g, replacement: '移動する' },
      { pattern: /周る/g, replacement: '移動する' },
      
      // 状態・位置系
      { pattern: /乗っている/g, replacement: '設置されている' },
      { pattern: /裏に/g, replacement: '後方に' },
      { pattern: /前に/g, replacement: '前方に' },
      
      // 問題・現象系
      { pattern: /破れる/g, replacement: '破損する' },
      { pattern: /壊れる/g, replacement: '損傷する' },
      { pattern: /だめ/g, replacement: '不適切' },
      
      // 接続詞・助詞
      { pattern: /これを/g, replacement: 'フィルターを' },
      { pattern: /それを/g, replacement: '対象物を' }
    ]
    
    manufacturingPhrases.forEach(({pattern, replacement}) => {
      rewritten = rewritten.replace(pattern, replacement)
    })
    
    // 基本的な文体の改善（安全な変換のみ）
    rewritten = rewritten
      .replace(/〜/g, '～') // 波ダッシュの統一
      .replace(/(\w+)だけ/g, '$1のみ') // だけ→のみ
    
    // フィールド別の文章構造改善
    if (fieldType === 'problem') {
      // 問題点の場合、冒頭に説明を追加
      if (!rewritten.includes('問題点として') && !rewritten.includes('課題として') && !rewritten.includes('における問題')) {
        rewritten = '作業における問題点として、' + rewritten
      }
    } else if (fieldType === 'kaizenContent') {
      // カイゼン内容の場合、冒頭に説明を追加
      if (!rewritten.includes('改善策として') && !rewritten.includes('カイゼン内容として') && !rewritten.includes('として')) {
        rewritten = 'カイゼン内容として、' + rewritten
      }
    }
    
    // 文末の調整
    if (!rewritten.endsWith('。')) {
      if (rewritten.endsWith('る') || rewritten.endsWith('た')) {
        rewritten += '。'
      } else {
        rewritten += 'である。'
      }
    }
    
    // 文章の最終調整（安全な処理のみ）
    rewritten = rewritten
      .replace(/\s+/g, ' ') // 複数スペースを単一スペースに
      .trim()
    
    console.log('リライト結果:', rewritten)
    return rewritten
  }

  // Claude.aiを使った高精度AI校正（IA相談方式）
  const handleAIProofreadWithClaude = async (text, fieldType) => {
    const fieldDescription = {
      'problem': '問題点',
      'kaizenContent': 'カイゼン内容',
      'kaizenEffect': 'カイゼン効果',
      'progressComment': '経過確認コメント'
    }[fieldType] || 'テキスト'

    // 元の文章とプロンプトを一つにまとめる（IA相談と同じ方式）
    const combinedPrompt = `【リライトしたい${fieldDescription}】
${text}

---

あなたは製造業の改善活動報告書を校正する専門家です。上記の${fieldDescription}を校正・リライトしてください。

【校正の方針】
1. 誤字脱字を全て修正
2. 冗長な表現をかみ砕き、簡潔にまとめる
3. 曖昧な表現を具体的に言い換える
4. 口語表現を書き言葉に統一
5. 製造業の専門用語を適切に使用
6. 読みやすく論理的な文章に再構成
7. 元の意味・内容は絶対に変えない

【指示】
- 校正後の文章のみを出力してください
- 説明文や前置きは不要です
- 「校正後:」などの見出しも不要です`

    // シンプルな1ステップ方式
    try {
      // 結合したプロンプトをクリップボードにコピー
      await navigator.clipboard.writeText(combinedPrompt)

      // 確認ダイアログ
      const confirmed = confirm(
        '【AI校正プロンプトをコピーしました】\n\n' +
        'OKを押すとClaude.aiが開きます。\n' +
        'チャット欄に貼り付け（Ctrl+V / Cmd+V）して送信してください。\n\n' +
        'Claudeの校正結果をコピーして、このアプリに戻って貼り付けてください。'
      )

      if (!confirmed) {
        return text // キャンセル
      }

      // Claude.aiを開く
      // ランダムIDを追加して、下書き復元を回避する試み
      const randomId = Math.random().toString(36).substring(7)
      window.open(`https://claude.ai/chat/${randomId}`, '_blank', 'noopener,noreferrer')

      console.log('=== AI高精度校正（Claude連携）===')
      console.log('結合プロンプト:', combinedPrompt)

    } catch (error) {
      console.error('クリップボードエラー:', error)
      showToast('クリップボードへのアクセスに失敗しました。\n\nエラー: ' + error.message + '\n\n手動でコピーしてください。', 'error')
    }

    // 入力欄をクリアして、Claudeの結果を貼り付けやすくする
    return ''
  }

  // AI校正・リライト機能
  const handleAIProofread = async (text, fieldType) => {
    if (!text || text.trim() === '') {
      showToast('校正するテキストがありません。', 'info')
      return text
    }

    // 校正方法を選択
    const choice = confirm(
      '【AI校正方法の選択】\n\n' +
      '高精度AI校正を使用しますか？\n\n' +
      '■ OKを押す → Claude.aiで高精度校正\n' +
      '  ・冗長な表現を簡潔にまとめる\n' +
      '  ・曖昧な表現を具体的に言い換える\n' +
      '  ・外部タブでコピペ作業が必要\n\n' +
      '■ キャンセルを押す → 辞書方式で簡易校正\n' +
      '  ・基本的な誤字脱字修正\n' +
      '  ・アプリ内で完結、すぐに結果表示'
    )

    if (choice) {
      // 高精度AI校正（Claude.ai連携）
      return await handleAIProofreadWithClaude(text, fieldType)
    }

    // 以下、辞書方式の校正
    try {
      // ローディング状態を表示
      const loadingMessage = fieldType === 'problem' ? '問題点を校正中...' : 
                            fieldType === 'kaizenContent' ? 'カイゼン内容を校正中...' : 
                            fieldType === 'kaizenEffect' ? 'カイゼン効果を校正中...' :
                            fieldType === 'progressComment' ? '経過確認コメントを校正中...' : 'テキストを校正中...'
      
      const originalAlert = window.alert
      window.alert = () => {} // 一時的にalertを無効化
      
      // OpenAI API風のプロンプトでローカルAI機能をシミュレート
      const prompt = `以下の${fieldType === 'problem' ? '問題点' : 
                                fieldType === 'kaizenContent' ? 'カイゼン内容' : 
                                fieldType === 'kaizenEffect' ? 'カイゼン効果' : 
                                fieldType === 'progressComment' ? '経過確認コメント' : 'テキスト'}を、
製造業・改善活動の文脈に適した形で校正・リライトしてください。
誤字脱字を修正し、文章をより分かりやすく整理してください。
ただし、元の意味や内容は変えずに、より読みやすく専門的な表現にしてください。

元のテキスト:
${text}

校正後のテキスト:`

      // デバッグ用にログ出力
      console.log('=== AI校正処理開始 ===')
      console.log('元のテキスト:', text)
      console.log('フィールドタイプ:', fieldType)

      // 空のテキストの場合は処理しない
      if (!text || text.trim() === '') {
        showToast('校正するテキストがありません。', 'info')
        return text
      }

      // 強化された校正・リライト機能
      let correctedText = text
      let changeCount = 0

      // 強化された校正処理（辞書方式）
      const allCorrections = [
        // 基本的な誤字脱字
        { from: 'てす', to: 'です', category: '誤字修正' },
        { from: 'でず', to: 'です', category: '誤字修正' },
        { from: 'ゆう', to: 'いう', category: '誤字修正' },
        { from: 'そうゆう', to: 'そういう', category: '誤字修正' },
        { from: '下さい', to: 'ください', category: '漢字統一' },
        { from: '出来る', to: 'できる', category: '漢字統一' },
        { from: '出来た', to: 'できた', category: '漢字統一' },
        { from: '出来ない', to: 'できない', category: '漢字統一' },
        { from: '有る', to: 'ある', category: '漢字統一' },
        { from: '無い', to: 'ない', category: '漢字統一' },
        { from: '致します', to: 'いたします', category: '漢字統一' },
        { from: '宜しく', to: 'よろしく', category: '漢字統一' },
        { from: '又は', to: 'または', category: '漢字統一' },
        { from: '及び', to: 'および', category: '漢字統一' },
        { from: '但し', to: 'ただし', category: '漢字統一' },
        { from: '尚', to: 'なお', category: '漢字統一' },

        // 製造業用語（拡充）
        { from: '改善', to: 'カイゼン', category: '専門用語' },
        { from: 'かいぜん', to: 'カイゼン', category: '専門用語' },
        { from: 'コストダウン', to: 'コスト削減', category: '専門用語' },
        { from: '品質向上', to: '品質改善', category: '専門用語' },
        { from: '作業性', to: '作業効率', category: '専門用語' },
        { from: '時短', to: '時間短縮', category: '専門用語' },
        { from: 'さび', to: '錆', category: '専門用語' },
        { from: 'サビ', to: '錆', category: '専門用語' },
        { from: '錆び', to: '錆', category: '専門用語' },
        { from: '不良品', to: '不良', category: '専門用語' },
        { from: '作業場', to: '作業エリア', category: '専門用語' },
        { from: '工場', to: '製造現場', category: '専門用語' },
        { from: 'ライン', to: '生産ライン', category: '専門用語' },
        { from: '機械', to: '設備', category: '専門用語' },
        { from: '道具', to: '治具', category: '専門用語' },
        { from: 'スピードアップ', to: '効率化', category: '専門用語' },
        { from: 'ミス', to: '不具合', category: '専門用語' },
        { from: 'トラブル', to: '問題', category: '専門用語' },

        // 一般的な表現改善（拡充）
        { from: 'でも', to: 'しかし', category: '接続詞' },
        { from: 'だけど', to: 'しかし', category: '接続詞' },
        { from: 'けれど', to: 'しかし', category: '接続詞' },
        { from: 'けど', to: 'しかし', category: '接続詞' },
        { from: 'なので', to: 'そのため', category: '接続詞' },
        { from: 'だから', to: 'そのため', category: '接続詞' },
        { from: 'それで', to: 'そのため', category: '接続詞' },
        { from: 'あと', to: 'また', category: '接続詞' },
        { from: 'ちなみに', to: 'なお', category: '接続詞' },
        { from: '思う', to: '考える', category: '書き言葉化' },
        { from: '見る', to: '確認する', category: '書き言葉化' },
        { from: 'やる', to: '実施する', category: '書き言葉化' },
        { from: '使う', to: '使用する', category: '書き言葉化' },
        { from: '作る', to: '作成する', category: '書き言葉化' },
        { from: '直す', to: '修正する', category: '書き言葉化' },
        { from: '変える', to: '変更する', category: '書き言葉化' },
        { from: '増やす', to: '増加させる', category: '書き言葉化' },
        { from: '減らす', to: '削減する', category: '書き言葉化' },
        { from: 'なくす', to: '廃止する', category: '書き言葉化' },
        { from: '付ける', to: '設置する', category: '書き言葉化' },
        { from: '置く', to: '配置する', category: '書き言葉化' },
        { from: 'とる', to: '取得する', category: '書き言葉化' },
        { from: 'いる', to: 'ある', category: '書き言葉化' },

        // 曖昧表現の具体化
        { from: 'たくさん', to: '多数', category: '曖昧表現改善' },
        { from: 'ちょっと', to: '若干', category: '曖昧表現改善' },
        { from: 'すごく', to: '非常に', category: '曖昧表現改善' },
        { from: 'とても', to: '非常に', category: '曖昧表現改善' },
        { from: 'かなり', to: '大幅に', category: '曖昧表現改善' },
        { from: 'いっぱい', to: '多数', category: '曖昧表現改善' },
        { from: 'なんか', to: '', category: '曖昧表現改善' },
        { from: 'みたいな', to: 'のような', category: '曖昧表現改善' },
        { from: 'っぽい', to: 'のような', category: '曖昧表現改善' },
        { from: '的な', to: 'のような', category: '曖昧表現改善' },
        { from: '結構', to: '比較的', category: '曖昧表現改善' },
        { from: 'わりと', to: '比較的', category: '曖昧表現改善' },

        // 問題表現の改善（注：「困っている」は正規表現で処理するため除外）
        { from: '困る', to: '支障がある', category: '問題表現改善' },
        { from: '大変', to: '作業負荷が高い', category: '問題表現改善' },
        { from: 'めんどう', to: '非効率', category: '問題表現改善' },
        { from: '面倒', to: '非効率', category: '問題表現改善' },
        { from: 'ダメ', to: '不適切', category: '問題表現改善' },
        { from: 'だめ', to: '不適切', category: '問題表現改善' },
        { from: 'よくない', to: '不良', category: '問題表現改善' },
        { from: '悪い', to: '不良', category: '問題表現改善' },
        { from: 'まずい', to: '問題がある', category: '問題表現改善' },
        { from: '汚い', to: '汚れている', category: '問題表現改善' },
        { from: '古い', to: '老朽化している', category: '問題表現改善' },
        { from: '壊れている', to: '故障している', category: '問題表現改善' },

        // 効果表現の改善
        { from: 'よくなった', to: '改善された', category: '効果表現改善' },
        { from: '良くなった', to: '改善された', category: '効果表現改善' },
        { from: '早くなった', to: '短縮された', category: '効果表現改善' },
        { from: '速くなった', to: '短縮された', category: '効果表現改善' },
        { from: '減った', to: '削減された', category: '効果表現改善' },
        { from: '増えた', to: '増加した', category: '効果表現改善' },
        { from: '楽になった', to: '作業負荷が軽減された', category: '効果表現改善' },
        { from: '簡単になった', to: '簡略化された', category: '効果表現改善' },
        { from: 'きれいになった', to: '清浄化された', category: '効果表現改善' },
        { from: '綺麗になった', to: '清浄化された', category: '効果表現改善' }
      ]

      // フィールド別の追加修正
      const fieldSpecificCorrections = {
        'problem': [
          { from: 'だめ', to: '不適切', category: '問題表現' },
          { from: 'よくない', to: '改善が必要', category: '問題表現' },
          { from: '悪い', to: '不良', category: '問題表現' },
          { from: 'やりにくい', to: '作業効率が悪い', category: '問題表現' },
          { from: '面倒', to: '非効率', category: '問題表現' }
        ],
        'kaizenContent': [
          { from: 'やった', to: '実施した', category: '改善表現' },
          { from: '変えた', to: '変更した', category: '改善表現' },
          { from: '直した', to: '修正した', category: '改善表現' },
          { from: '作った', to: '作成した', category: '改善表現' }
        ],
        'kaizenEffect': [
          { from: 'よくなった', to: '改善された', category: '効果表現' },
          { from: '早くなった', to: '効率化された', category: '効果表現' },
          { from: '減った', to: '削減された', category: '効果表現' },
          { from: '楽になった', to: '作業負荷が軽減された', category: '効果表現' }
        ],
        'progressComment': [
          { from: '順調', to: '計画通り進捗', category: '進捗表現' },
          { from: 'うまくいって', to: '良好に推移して', category: '進捗表現' },
          { from: '問題ない', to: '支障なく', category: '進捗表現' }
        ]
      }

      // === 校正処理の実行順序（非常に重要）===
      // 1. 複合表現（最優先）
      // 2. 辞書置換
      // 3. 文章構造
      // 4. 配置表現

      // ステップ1: 複合的な表現を最優先で処理（具体的なパターン優先）
      const step1Patterns = [
        // 「〜が増えて困っている」などの複合表現
        { from: /が増えて困っている/g, to: 'が増加しており対策が必要である', category: '構造改善' },
        { from: /が減って困っている/g, to: 'が減少しており対策が必要である', category: '構造改善' },
        { from: /が多くて困っている/g, to: 'が多く対策が必要である', category: '構造改善' },
        { from: /がひどくて困っている/g, to: 'がひどく対策が必要である', category: '構造改善' },
      ]

      step1Patterns.forEach(pattern => {
        const before = correctedText
        correctedText = correctedText.replace(pattern.from, pattern.to)
        if (before !== correctedText) {
          changeCount++
          console.log(`${pattern.category}: 複合表現を改善`)
        }
      })

      // ステップ2: 辞書置換（基本的な語句の修正）
      const corrections = [...allCorrections]
      if (fieldSpecificCorrections[fieldType]) {
        corrections.push(...fieldSpecificCorrections[fieldType])
      }

      corrections.forEach(correction => {
        const regex = new RegExp(correction.from, 'g')
        const matches = correctedText.match(regex)
        if (matches) {
          correctedText = correctedText.replace(regex, correction.to)
          changeCount += matches.length
          console.log(`${correction.category}: "${correction.from}" → "${correction.to}" (${matches.length}箇所)`)
        }
      })

      // ステップ3: 文章構造の基本的な改善
      const step3Patterns = [
        // 「〜の中の〜」→「〜内の〜」
        { from: /([ぁ-ん\u4E00-\u9FFF]+)の中の([ぁ-ん\u4E00-\u9FFF]+)/g, to: '$1内の$2', category: '構造改善' },
        { from: /([ぁ-ん\u4E00-\u9FFF]+)の中/g, to: '$1内', category: '構造改善' },
        // 「〜のエリア」→「〜エリア」
        { from: /のエリア/g, to: 'エリア', category: '構造改善' },
        // 「〜です。〜です。」→「〜であり、〜である。」
        { from: /です。([^。]{10,30})です。/g, to: 'であり、$1である。', category: '構造改善' }
      ]

      step3Patterns.forEach(pattern => {
        const before = correctedText
        correctedText = correctedText.replace(pattern.from, pattern.to)
        if (before !== correctedText) {
          changeCount++
          console.log(`${pattern.category}: 文章構造を改善`)
        }
      })

      // ステップ4: 「置いてある」系の変換（最後に処理）
      const step4Patterns = [
        { from: /が置いてある/g, to: 'を配置している', category: '構造改善' },
        { from: /が置いてる/g, to: 'を配置している', category: '構造改善' },
        { from: /を置いてある/g, to: 'を配置している', category: '構造改善' },
      ]

      step4Patterns.forEach(pattern => {
        const before = correctedText
        correctedText = correctedText.replace(pattern.from, pattern.to)
        if (before !== correctedText) {
          changeCount++
          console.log(`${pattern.category}: 配置表現を改善`)
        }
      })

      // 記号・数字の統一
      const symbolCorrections = [
        { from: /,/g, to: '、' },
        { from: /０/g, to: '0' }, { from: /１/g, to: '1' }, { from: /２/g, to: '2' },
        { from: /３/g, to: '3' }, { from: /４/g, to: '4' }, { from: /５/g, to: '5' },
        { from: /６/g, to: '6' }, { from: /７/g, to: '7' }, { from: /８/g, to: '8' },
        { from: /９/g, to: '9' },
        { from: /　/g, to: ' ' }
      ]

      symbolCorrections.forEach(correction => {
        const before = correctedText
        correctedText = correctedText.replace(correction.from, correction.to)
        if (before !== correctedText) changeCount++
      })

      // 文章の整理
      correctedText = correctedText
        .replace(/\s+/g, ' ')
        .replace(/。\s*。/g, '。')
        .replace(/、\s*、/g, '、')
        .trim()

      console.log('校正後のテキスト:', correctedText)
      console.log('変更箇所数:', changeCount)
      console.log('=== AI校正処理完了 ===')

      // 基本的な語句置換で変更がない場合は、文章全体をリライト
      if (correctedText === text && text.length > 0) {
        console.log('基本校正では変更がありませんでした。文章全体をリライトします。')
        correctedText = rewriteSentence(text, fieldType)
        if (correctedText !== text) {
          changeCount = 1
          console.log('文章リライト完了:', correctedText)
        } else {
          correctedText = text + '（校正済み）'
          changeCount = 1
        }
      }

      window.alert = originalAlert // alertを復元

      // 校正結果の表示
      console.log('最終確認 - 元の文章:', JSON.stringify(text))
      console.log('最終確認 - 校正後:', JSON.stringify(correctedText))
      
      // ダイアログで結果を表示
      const dialogMessage = `AI校正・リライト結果:\n\n【元の文章】\n${text}\n\n【校正後】\n${correctedText}\n\n【変更箇所数】${changeCount}箇所\n\nこの内容で更新しますか？`
      
      console.log('ダイアログメッセージ:', dialogMessage)
      
      const confirmed = confirm(dialogMessage)
      
      if (confirmed) {
        const finalText = correctedText.replace('（校正済み）', '')
        console.log('最終的に返却するテキスト:', JSON.stringify(finalText))
        return finalText
      } else {
        console.log('ユーザーがキャンセルしました')
        return text
      }

    } catch (error) {
      console.error('AI校正エラー:', error)
      showToast('校正処理中にエラーが発生しました: ' + error.message, 'error')
      return text
    }
  }

  // PDF保存機能
  const handleSavePDF = async () => {
    const fileName = `活動報告書_${previewData?.reportNumber || '未設定'}_${new Date().toISOString().split('T')[0]}.pdf`

    await generatePDF('report-preview-content', {
      fileName: fileName,
      width: 794,
      height: 1123,
      orientation: 'portrait',
      scale: 3,
      maintainAspectRatio: true,
      margin: 10,
      onSuccess: () => {
        showToast('PDF保存が完了しました！', 'success')
      },
      onError: (error) => {
        showToast('PDF保存中にエラーが発生しました: ' + error.message, 'error')
      }
    })
  }

  // JPEG保存機能
  const handleSaveJPEG = async () => {
    try {
      // 動的インポートを実行時に読み込み
      const html2canvasModule = await import('html2canvas')
      const html2canvasDefault = html2canvasModule.default || html2canvasModule
      
      const element = document.getElementById('report-preview-content')
      if (!element) {
        showToast('プレビュー内容が見つかりません。', 'error')
        return
      }

      const canvas = await html2canvasDefault(element, {
        scale: 3, // 高解像度でキャプチャ
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794, // A4幅 (210mm = 794px at 96dpi)
        height: 1123 // A4高さ (297mm = 1123px at 96dpi)
      })

      // Canvasから画像データを取得
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('画像の変換に失敗しました。', 'error')
          return
        }
        
        const fileName = `活動報告書_${previewData?.reportNumber || '未設定'}_${new Date().toISOString().split('T')[0]}.jpg`
        
        // ダウンロードリンクを作成
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        showToast('JPEG保存が完了しました！', 'success')
      }, 'image/jpeg', 0.95)
      
    } catch (error) {
      console.error('JPEG保存エラー:', error)
      showToast('JPEG保存中にエラーが発生しました: ' + error.message, 'error')
    }
  }


  // オープニング画面表示中は常にオープニング画面を表示
  if (showOpening) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "white",
        padding: "20px",
        position: "relative"
      }}>
        {/* ヘルプボタン */}
        <button
          onClick={() => setShowHelp(true)}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "2px solid white",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)"
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
          }}
        >
          ❓ 使い方
        </button>

        <div style={{ textAlign: "center", maxWidth: "800px" }}>
          <h1 style={{
            fontSize: "6em",
            margin: "0",
            fontWeight: "900",
            letterSpacing: "0.05em",
            textShadow: "3px 3px 6px rgba(0,0,0,0.3)"
          }}>
            MKG
          </h1>
          <div style={{
            width: "100px",
            height: "4px",
            backgroundColor: "#32CD32",
            margin: "30px auto",
            borderRadius: "2px"
          }}></div>
          <p style={{
            fontSize: "1.8em",
            margin: "0",
            fontWeight: "300",
            letterSpacing: "0.1em",
            opacity: 0.95
          }}>
            カイゼン活動管理アプリ
          </p>
          <p style={{
            fontSize: "1em",
            margin: "20px 0 0 0",
            opacity: 0.8,
            fontWeight: "300"
          }}>
            継続的改善によるムリ・ムラ・ムダの撲滅
          </p>

          {/* ログイン済みの場合はボタンを表示しない（自動遷移） */}
          {!isLoggedIn && (
            <button
              onClick={() => {
                setShowOpening(false)
                setCurrentScreen('login')
              }}
              style={{
                padding: "15px 40px",
                fontSize: "1.2em",
                fontWeight: "bold",
                color: "white",
                backgroundColor: "#32CD32",
                border: "none",
                borderRadius: "30px",
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                transition: "all 0.3s ease",
                marginTop: "20px"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)"
                e.target.style.boxShadow = "0 15px 30px rgba(0,0,0,0.3)"
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "0 10px 20px rgba(0,0,0,0.2)"
              }}
            >
              アプリを始める
            </button>
          )}
        </div>

        {/* ヘルプモーダル */}
        {showHelp && (
          <div
            onClick={() => setShowHelp(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10000
            }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "white",
                padding: "40px",
                borderRadius: "12px",
                maxWidth: "800px",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
              }}>
              <h2 style={{ marginTop: 0, color: "#667eea", fontSize: "28px" }}>
                📖 MKGカイゼン活動管理アプリ 使い方ガイド
              </h2>

              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                  🚀 アプリのインストール方法
                </h3>

                <div style={{ marginLeft: "20px", marginTop: "15px" }}>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>【方法1】PWAとしてインストール（推奨）</h4>
                  <ol style={{ lineHeight: "1.8", color: "#555" }}>
                    <li><strong>Chromeプロファイルを作成</strong>
                      <ul style={{ marginTop: "8px" }}>
                        <li>Chromeを開き、右上のアイコンをクリック</li>
                        <li>「追加」→「プロファイルを追加」</li>
                        <li>自分の名前を入力（例: kanou）</li>
                      </ul>
                    </li>
                    <li style={{ marginTop: "12px" }}><strong>アプリをインストール</strong>
                      <ul style={{ marginTop: "8px" }}>
                        <li>自分のChromeプロファイルで、アプリのURL（{typeof window !== 'undefined' ? window.location.origin : 'デプロイURL'}）にアクセス</li>
                        <li>アドレスバー右側の「インストール」ボタン（⬇アイコン）をクリック</li>
                        <li>デスクトップにアプリアイコンが作成されます</li>
                      </ul>
                    </li>
                    <li style={{ marginTop: "12px" }}><strong>アイコン名を変更（任意）</strong>
                      <ul style={{ marginTop: "8px" }}>
                        <li>デスクトップのアイコンを右クリック → 名前変更</li>
                        <li>「MKGアプリ - 自分の名前」に変更すると分かりやすい</li>
                      </ul>
                    </li>
                  </ol>

                  <h4 style={{ color: "#333", marginBottom: "10px", marginTop: "20px" }}>【方法2】ブックマーク/ショートカット</h4>
                  <ol style={{ lineHeight: "1.8", color: "#555" }}>
                    <li>自分のChromeプロファイルでアプリのURLにアクセス</li>
                    <li>ブックマークに追加、またはデスクトップにショートカット作成</li>
                    <li>以降はブックマーク/ショートカットから起動</li>
                  </ol>
                </div>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                  👥 複数人で使用する場合
                </h3>
                <ul style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                  <li>各社員が自分専用のChromeプロファイルを作成</li>
                  <li>各プロファイルから個別にPWAをインストール</li>
                  <li>デスクトップには各自のアイコンが並ぶ（例: 「MKGアプリ - 叶俊輔」「MKGアプリ - kanou keiko」）</li>
                  <li>自分のアイコンをクリックすると、自分専用の環境で起動</li>
                  <li>ログイン状態、データは完全に分離される</li>
                </ul>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                  🔐 初回ログイン
                </h3>
                <ol style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                  <li>新規登録画面から「名前」「パスワード」「所属チーム」を入力</li>
                  <li>名前は英字のみ（スペースも可）</li>
                  <li>登録が完了すると自動的にログインされます</li>
                  <li>次回からはログイン画面から名前とパスワードを入力</li>
                </ol>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                  📱 主な機能
                </h3>
                <ul style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                  <li><strong>Plan（計画）</strong>: 展開表の作成・改善目標の設定</li>
                  <li><strong>Do（実行）</strong>: タスク管理・活動の推進</li>
                  <li><strong>Check（確認）</strong>: 報告書作成・パトロールチェック</li>
                  <li><strong>Act（改善）</strong>: AI相談による再展開・改善策の更新</li>
                </ul>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                  ❓ よくある質問
                </h3>
                <div style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                  <p><strong>Q: パスワードを忘れました</strong><br/>
                  A: 管理者に連絡してパスワードをリセットしてもらってください。</p>

                  <p><strong>Q: 他の人のデータが見えてしまいます</strong><br/>
                  A: Chromeプロファイルが混在している可能性があります。正しい自分のプロファイルから起動してください。</p>

                  <p><strong>Q: オフラインで使えますか？</strong><br/>
                  A: PWAインストール後は、一部機能がオフラインで利用可能です（データベースへのアクセスはオンライン必須）。</p>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "30px" }}>
                <button
                  onClick={() => setShowHelp(false)}
                  style={{
                    padding: "12px 30px",
                    backgroundColor: "#667eea",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ログイン画面
  if (currentScreen === 'login') {
    const handleLoginSubmit = async (e) => {
      e.preventDefault()
      const loginSuccess = await handleLogin(username, password)
      if (loginSuccess) {
        setLoginError('')
        setUsername('')
        setPassword('')
      } else {
        setLoginError('苗字またはパスワードが正しくありません')
      }
    }

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          width: "400px"
        }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ color: "#333", marginBottom: "10px" }}>🔐 ログイン</h2>
            <p style={{ color: "#666" }}>MKGアプリへようこそ</p>
          </div>
          
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                苗字（英字）:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    document.getElementById('password-input')?.focus()
                  }
                }}
                autoComplete="username"
                inputMode="latin"
                id="username-input"
                style={{
                  width: "100%",
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  imeMode: "disabled"
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                パスワード:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      document.getElementById('username-input')?.focus()
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      handleLoginSubmit(e)
                    }
                  }}
                  id="password-input"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "16px",
                    paddingRight: "45px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "15px",
                    boxSizing: "border-box"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "15px",
                    color: "#666"
                  }}
                >
                  {showLoginPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div style={{
                color: "#dc3545",
                backgroundColor: "#f8d7da",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "20px",
                textAlign: "center"
              }}>
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ログイン
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "30px", display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => setCurrentScreen('cover')}
              style={{
                backgroundColor: "transparent",
                color: "#666",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              ← 戻る
            </button>
            <button
              onClick={() => setCurrentScreen('register')}
              style={{
                backgroundColor: "transparent",
                color: "#007bff",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: "bold"
              }}
            >
              新規登録はこちら →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 新規登録画面
  if (currentScreen === 'register') {
    const handleRegisterSubmit = async (e) => {
      e.preventDefault()
      await handleRegister()
    }

    const toggleTeamSelection = (teamId) => {
      const newSelectedTeams = registerData.selectedTeams.includes(teamId)
        ? registerData.selectedTeams.filter(id => id !== teamId)
        : [...registerData.selectedTeams, teamId]
      
      setRegisterData({...registerData, selectedTeams: newSelectedTeams})
    }

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          width: "500px",
          maxHeight: "90vh",
          overflowY: "auto"
        }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ color: "#333", marginBottom: "10px" }}>📝 新規ユーザー登録</h2>
            <p style={{ color: "#666" }}>MKGアプリへの参加申請</p>
          </div>
          
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                苗字（英字）:
              </label>
              <input
                type="text"
                value={registerData.username}
                onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    document.getElementById('register-password-input')?.focus()
                  }
                }}
                autoComplete="username"
                inputMode="latin"
                id="register-username-input"
                style={{
                  width: "100%",
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  imeMode: "disabled"
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                パスワード:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      document.getElementById('register-username-input')?.focus()
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      document.getElementById('register-confirm-password-input')?.focus()
                    }
                  }}
                  id="register-password-input"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "16px",
                    paddingRight: "45px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "15px",
                    boxSizing: "border-box"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "15px",
                    color: "#666"
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                パスワード確認:
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      document.getElementById('register-password-input')?.focus()
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      handleRegisterSubmit(e)
                    }
                  }}
                  id="register-confirm-password-input"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "16px",
                    paddingRight: "45px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    fontSize: "15px",
                    boxSizing: "border-box"
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "15px",
                    color: "#666"
                  }}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
                所属チーム（複数選択可）:
              </label>
              <div style={{ display: "grid", gap: "10px" }}>
                {teamsList.map(team => (
                  <label key={team.id} style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px",
                    border: `2px solid ${registerData.selectedTeams.includes(team.id) ? team.color : '#ddd'}`,
                    borderRadius: "5px",
                    cursor: "pointer",
                    backgroundColor: registerData.selectedTeams.includes(team.id) ? `${team.color}20` : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={registerData.selectedTeams.includes(team.id)}
                      onChange={() => toggleTeamSelection(team.id)}
                      style={{ marginRight: "10px" }}
                    />
                    <span style={{ fontWeight: "bold" }}>{team.name} ({team.id})</span>
                  </label>
                ))}
              </div>
            </div>
            
            {registerError && (
              <div style={{
                color: "#dc3545",
                backgroundColor: "#f8d7da",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "20px",
                textAlign: "center"
              }}>
                {registerError}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: "20px"
              }}
            >
              登録
            </button>
          </form>
          
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => {
                setCurrentScreen('login')
                setUsername('')
                setPassword('')
                setShowLoginPassword(false)
              }}
              style={{
                backgroundColor: "transparent",
                color: "#666",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              ← ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // チーム選択画面
  if (currentScreen === 'team-select') {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          width: "500px"
        }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ color: "#333", marginBottom: "10px" }}>
              👋 {currentUser?.username}さん、こんにちは
            </h2>
            <p style={{ color: "#666" }}>参加するチームを選択してください</p>
          </div>
          
          <div style={{ display: "grid", gap: "15px" }}>
            {teamsList
              .filter(team => {
                // userTeams（custom_usersから取得）がある場合はそれを使用
                if (userTeams.length > 0) {
                  console.log('✅ userTeams使用:', userTeams)
                  return userTeams.includes(team.id)
                }
                // user_metadata.teams がある場合はそれを使用
                if (currentUser?.user_metadata?.teams) {
                  console.log('✅ user_metadata.teams使用:', currentUser.user_metadata.teams)
                  return currentUser.user_metadata.teams.includes(team.id)
                }
                // どちらも未設定の場合は全チーム表示（初回ユーザー対応）
                console.log('⚠️ チーム情報未設定 - 全チーム表示')
                return true
              })
              .map(team => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team)}
                  style={{
                    padding: "20px",
                    backgroundColor: team.color,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "transform 0.2s ease"
                  }}
                  onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                  onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                >
                  <span style={{ fontSize: "15px" }}>🔧</span>
                  {team.name} ({team.id})
                </button>
              ))}
          </div>

          {/* 管理者専用設定セクション */}
          {(isKanoAdmin() || isAdmin()) && (
            <div style={{
              marginTop: "30px",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "2px solid #dc3545"
            }}>
              <h3 style={{ color: "#dc3545", textAlign: "center", margin: "0 0 20px 0" }}>
                🔧 管理者専用設定
              </h3>

              {/* コントロールボタン */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    console.log('📊 管理者エリア - データベース監視ボタンクリック')
                    setAdminSettings(prev => ({ ...prev, showDatabaseMonitor: true }))
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#17a2b8",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  📊 DB監視
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    console.log('👥 管理者エリア - 管理者ユーザー管理ボタンクリック')
                    reloadAdminUsers()
                    setAdminSettings(prev => ({ ...prev, showAdminUserManagement: true }))
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  👥 管理者管理
                </button>
              </div>

              {/* 3列レイアウト */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 200px 1fr",
                gap: "20px",
                backgroundColor: "#ffffff",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #dee2e6"
              }}>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <button
              onClick={() => setCurrentScreen('login')}
              style={{
                backgroundColor: "transparent",
                color: "#666",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              ← ログイン画面に戻る
            </button>
          </div>
        </div>

        {/* APIキー設定モーダル */}
        {aiConsultation.showApiKeySetup && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              width: "500px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}>
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
                🤖 Claude API キー設定
              </h3>
              <p style={{ marginBottom: "15px", color: "#666", fontSize: "14px" }}>
                Claude APIキーを入力してください。キーは「sk-ant-api-」で始まります。
              </p>

              {/* 無料枠登録方法の説明 */}
              <div style={{
                backgroundColor: "#e7f3ff",
                border: "1px solid #b3d9ff",
                borderRadius: "6px",
                padding: "15px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#0056b3"
              }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "bold" }}>
                  💡 無料枠でのAPIキー取得方法
                </h4>
                <ol style={{ margin: "0", paddingLeft: "20px", lineHeight: "1.5" }}>
                  <li><strong>console.anthropic.com</strong> にアクセス</li>
                  <li>Googleアカウントまたはメールでサインアップ</li>
                  <li>「API Keys」→「Create Key」でキーを生成</li>
                  <li>生成されたキー（sk-ant-api-で始まる）をコピー</li>
                  <li>⚠️ <strong>重要</strong>: 無料枠は月5ドル分まで利用可能</li>
                </ol>
                <p style={{ margin: "10px 0 0 0", fontSize: "15px", fontStyle: "italic" }}>
                  ※ クレジットカード登録が必要ですが、無料枠内では課金されません
                </p>
              </div>
              <input
                type="password"
                value={aiConsultation.tempApiKey}
                onChange={(e) => setAiConsultation(prev => ({ ...prev, tempApiKey: e.target.value }))}
                placeholder="sk-ant-api-..."
                style={{
                  width: "100%",
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px"
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setAiConsultation(prev => ({
                    ...prev,
                    showApiKeySetup: false,
                    tempApiKey: ''
                  }))}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    const tempKey = aiConsultation.tempApiKey
                    if (tempKey && tempKey.startsWith('sk-ant-api')) {
                      setAiConsultation(prev => ({
                        ...prev,
                        apiKey: tempKey,
                        showApiKeySetup: false,
                        tempApiKey: ''
                      }))
                      showToast('APIキーが設定されました！', 'success')
                    } else {
                      showToast('正しいClaude APIキー形式ではありません。sk-ant-api- で始まるキーを入力してください。', 'error')
                    }
                  }}
                  disabled={!aiConsultation.tempApiKey?.startsWith('sk-ant-api')}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: aiConsultation.tempApiKey?.startsWith('sk-ant-api') ? "#28a745" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: aiConsultation.tempApiKey?.startsWith('sk-ant-api') ? "pointer" : "not-allowed"
                  }}
                >
                  設定完了
                </button>
              </div>
            </div>
          </div>
        )}


        {/* データベース監視モーダル（チーム選択画面内） */}
        {adminSettings.showDatabaseMonitor && currentScreen === 'team-select' && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999
            }}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              minWidth: "400px",
              maxWidth: "600px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              zIndex: 10000,
              maxHeight: "80vh",
              overflowY: "auto"
            }}>
              <h3 style={{ marginBottom: "20px", color: "#17a2b8" }}>
                📊 データベース使用量監視
              </h3>

              <div style={{
                padding: "15px",
                backgroundColor: databaseUsage?.warning ? "#fff3cd" : "#e7f3ff",
                borderRadius: "4px",
                marginBottom: "20px",
                border: `1px solid ${databaseUsage?.warning ? "#ffeaa7" : "#bee5eb"}`
              }}>
                {!databaseUsage ? (
                  <div>
                    <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#666" }}>
                      現在のデータベース使用量を確認してください（無料枠：500MB制限）
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        checkDatabaseUsage()
                      }}
                      disabled={usageLoading}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: usageLoading ? "#6c757d" : "#17a2b8",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: usageLoading ? "not-allowed" : "pointer"
                      }}
                    >
                      {usageLoading ? "確認中..." : "使用量を確認"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#004085" }}>
                      使用量: {databaseUsage.usedSize} / 500MB
                    </p>

                    {databaseUsage.warning && (
                      <div style={{
                        padding: "10px",
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffeaa7",
                        borderRadius: "4px",
                        marginBottom: "10px"
                      }}>
                        <strong style={{ color: "#856404" }}>⚠️ 警告</strong>
                        <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#856404" }}>
                          使用量が80%を超えています。不要なデータの削除を検討してください。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setAdminSettings(prev => ({ ...prev, showDatabaseMonitor: false }))
                    setDatabaseUsage(null)
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 管理者ユーザー管理モーダル（チーム選択画面内） */}
        {adminSettings.showAdminUserManagement && currentScreen === 'team-select' && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999
            }}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                minWidth: "500px",
                maxWidth: "700px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                zIndex: 10000,
                maxHeight: "80vh",
                overflowY: "auto"
              }}>
              <h3 style={{ marginBottom: "20px", color: "#6c757d" }}>
                👥 管理者ユーザー管理
              </h3>

              {/* 新しい管理者を追加 */}
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <h4 style={{ marginTop: 0, marginBottom: "15px", fontSize: "16px" }}>
                  管理者を追加
                </h4>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAdmin()
                      }
                    }}
                    placeholder="ユーザー名を入力"
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                  <button
                    onClick={handleAddAdmin}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* 現在の管理者リスト */}
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <h4 style={{ marginTop: 0, marginBottom: "15px", fontSize: "16px" }}>
                  現在の管理者（{adminUserList.length}人）
                </h4>
                {adminUserList.length === 0 ? (
                  <p style={{ color: "#666", margin: 0 }}>管理者が登録されていません</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {adminUserList.map((admin) => (
                      <div
                        key={admin.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "white",
                          borderRadius: "6px",
                          border: "1px solid #dee2e6"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                            {admin.username}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            追加: {new Date(admin.created_at).toLocaleDateString('ja-JP')}
                            {admin.added_by && ` by ${admin.added_by}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAdmin(admin.username)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setAdminSettings(prev => ({ ...prev, showAdminUserManagement: false }))
                    setNewAdminUsername('')
                  }}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // メインアプリ画面
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* スマホ対応（768px未満） */
        @media (max-width: 767px) {
          /* 全体のパディング調整 */
          :global(body) {
            padding: 0 !important;
            margin: 0 !important;
            padding-bottom: 80px !important; /* フッター分の余白 */
          }

          /* ヘッダーの調整 */
          header {
            padding: 15px !important;
            margin-bottom: 15px !important;
            border-radius: 0 !important;
          }

          /* PDCAカードをスマホで非表示 */
          header > div:first-child > div:nth-child(2) {
            display: none !important;
          }

          /* 右側のボタンエリアをスマホで非表示（フッターに移動） */
          header > div:first-child > div:nth-child(3) {
            display: none !important;
          }

          /* 報告書カードを1列表示に */
          .report-cards-grid {
            grid-template-columns: 1fr !important;
          }

          /* サブタイトルをコンパクトに */
          header p {
            font-size: 11px !important;
            margin-top: 3px !important;
          }

          /* タイトルサイズ調整 */
          h1 {
            font-size: 20px !important;
            line-height: 1.3 !important;
          }

          h2 {
            font-size: 17px !important;
          }

          /* スマホ用フッターを表示 */
          .mobile-footer {
            display: block !important;
          }

          /* タブナビゲーションの横スクロール対応 */
          div[style*="borderBottom"][style*="flexWrap"] {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 5px !important;
          }

          /* パトロールチェックシートのテーブルを横スクロール可能に */
          #patrol-checklist-form {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 8px !important;
          }

          /* 基本情報エリアのレイアウト調整 */
          .patrol-basic-info > div {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }

          /* 基本情報の各項目を縦に */
          .patrol-basic-info label,
          .patrol-basic-info span {
            display: block !important;
            width: 100% !important;
          }

          .patrol-basic-info input,
          .patrol-basic-info select {
            width: 100% !important;
            max-width: 100% !important;
          }

          /* パトロールチェックシートのタイトル */
          #patrol-checklist-form h3 {
            font-size: 20px !important;
          }

          /* ======================================
             パトロールチェックシート スマホ対応
             縦画面：段階的表示UI
             横画面：横スクロール可能
             ====================================== */

          /* パトロールチェックシートPC版を縦画面では非表示 */
          #patrol-checklist-form {
            display: none !important;
          }

          /* ボタン群も縦画面では非表示 */
          #patrol-checklist-container > .no-print {
            display: none !important;
          }

          /* スマホ縦画面版：段階的表示UIを表示 */
          .mobile-patrol-step-view {
            display: block !important;
          }

          /* 画像の最適化 */
          img {
            max-width: 100% !important;
            height: auto !important;
          }

          /* ボタンのタッチ対応 */
          button {
            min-height: 44px !important;
            font-size: 14px !important;
            padding: 10px 15px !important;
            cursor: pointer;
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
          }

          /* タブボタンの調整 */
          .tab-button {
            font-size: 12px !important;
            padding: 8px 12px !important;
            white-space: nowrap;
          }

          /* タスクカードを縦1列に */
          .task-card {
            width: 100% !important;
            margin-bottom: 15px !important;
          }

          /* ToDoタブのグリッドレイアウトを縦1列に */
          #kaizen-task-board {
            grid-template-columns: 1fr !important;
          }

          /* テーブルのスクロール対応 */
          table {
            display: block !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch;
          }

          /* フォーム入力欄の最適化 */
          input, textarea, select {
            font-size: 16px !important;
            min-height: 44px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* テキストエリアの調整 */
          textarea {
            resize: vertical !important;
            min-height: 100px !important;
          }

          /* 画像アップロードエリアの調整 */
          .image-upload-area {
            min-height: 150px !important;
          }

          /* モーダル・ポップアップの調整（フッターは除外） */
          div[style*="position: fixed"]:not(.mobile-footer) {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            left: 0 !important;
            top: 0 !important;
            border-radius: 0 !important;
            overflow-y: auto !important;
          }

          /* モーダル内コンテンツの余白調整（フッターは除外） */
          div[style*="position: fixed"]:not(.mobile-footer) > div {
            padding: 15px !important;
          }

          /* カードコンテナの調整 */
          div[style*="border-radius"][style*="box-shadow"] {
            margin: 10px 0 !important;
            border-radius: 8px !important;
          }

          /* 横スクロール防止 */
          * {
            max-width: 100vw;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        }

        /* スマホ横画面時（768px未満 かつ landscape） */
        @media (max-width: 767px) and (orientation: landscape) {
          /* スマホ段階的表示UIを非表示 */
          .mobile-patrol-step-view {
            display: none !important;
          }

          /* 横画面時はパトロールチェックシートを表示 */
          #patrol-checklist-form {
            display: block !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 5px !important;
          }

          /* ボタン群も表示 */
          #patrol-checklist-container > .no-print {
            display: flex !important;
          }

          /* フォントサイズを小さく */
          #patrol-checklist-form {
            font-size: 10px !important;
          }

          #patrol-checklist-form h3 {
            font-size: 16px !important;
          }

          #patrol-checklist-form input,
          #patrol-checklist-form select,
          #patrol-checklist-form textarea {
            font-size: 10px !important;
            padding: 4px 6px !important;
          }

          /* グリッドのギャップを狭く */
          .patrol-items-grid {
            gap: 2px !important;
          }

          /* ボタンを小さく */
          .patrol-items-grid div > div {
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body {
            margin: 0;
            padding: 0;
          }

          body * {
            visibility: hidden;
          }

          #patrol-checklist-form,
          #patrol-checklist-form * {
            visibility: visible;
          }

          #patrol-checklist-form {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw !important;
            max-width: 100vw !important;
            height: auto !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: visible !important;
            padding: 8px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            border: 2px solid #007bff !important;
            background-color: white !important;
            font-size: 11px !important;
          }

          #patrol-checklist-form * {
            font-size: 11px !important;
          }

          #patrol-checklist-form h2 {
            font-size: 22px !important;
          }

          #patrol-checklist-form input,
          #patrol-checklist-form select,
          #patrol-checklist-form textarea {
            font-size: 11px !important;
          }

          #patrol-checklist-form textarea {
            word-break: break-all !important;
            overflow-wrap: break-word !important;
            white-space: pre-wrap !important;
            overflow: visible !important;
          }
        }
      `}</style>
      <header style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px 30px",
        borderRadius: "12px",
        marginBottom: "30px",
        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
          {/* 左側: タイトル */}
          <div style={{ minWidth: "280px" }}>
            <h1 style={{
              margin: "0 0 5px 0",
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
              textShadow: "2px 2px 4px rgba(0,0,0,0.2)"
            }}>
              MKGカイゼン活動管理アプリ
            </h1>
            <p style={{
              margin: "0",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: "300"
            }}>
              見える化されたPDCA ─ 改善の流れをひとつに。
            </p>
          </div>

          {/* 中央: PDCAカード */}
          <div style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flex: 1
          }}>
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(5px)",
              padding: "9px 15px",
              borderRadius: "6px",
              border: "3px solid #1976D2",
              flex: "1",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "13.5px", color: "#1976D2", marginBottom: "3px", fontWeight: "700" }}>
                Plan
              </div>
              <div style={{ fontSize: "15px", color: "#333", fontWeight: "500", lineHeight: "1.2" }}>
                展開表の作成・改善目標の設定
              </div>
            </div>

            <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "26px", fontWeight: "900" }}>→</div>

            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(5px)",
              padding: "9px 15px",
              borderRadius: "6px",
              border: "3px solid #388E3C",
              flex: "1",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "13.5px", color: "#388E3C", marginBottom: "3px", fontWeight: "700" }}>
                Do
              </div>
              <div style={{ fontSize: "15px", color: "#333", fontWeight: "500", lineHeight: "1.2" }}>
                タスク管理・活動の推進
              </div>
            </div>

            <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "26px", fontWeight: "900" }}>→</div>

            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(5px)",
              padding: "9px 15px",
              borderRadius: "6px",
              border: "3px solid #F57C00",
              flex: "1",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "13.5px", color: "#F57C00", marginBottom: "3px", fontWeight: "700" }}>
                Check
              </div>
              <div style={{ fontSize: "15px", color: "#333", fontWeight: "500", lineHeight: "1.2" }}>
                報告書作成・パトロールチェック
              </div>
            </div>

            <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "26px", fontWeight: "900" }}>→</div>

            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(5px)",
              padding: "9px 15px",
              borderRadius: "6px",
              border: "3px solid #C2185B",
              flex: "1",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: "13.5px", color: "#C2185B", marginBottom: "3px", fontWeight: "700" }}>
                Act
              </div>
              <div style={{ fontSize: "15px", color: "#333", fontWeight: "500", lineHeight: "1.2" }}>
                AI相談による再展開・改善策の更新
              </div>
            </div>
          </div>

          {/* 右側: ボタン・ログイン情報 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isKanoAdmin() && (
                <button
                  onClick={() => setCurrentScreen('team-select')}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)"
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
                  }}
                >
                  ⚙️ 管理者画面へ
                </button>
              )}
              <button
                onClick={handleLogout}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "rgba(220, 53, 69, 0.9)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(220, 53, 69, 1)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "rgba(220, 53, 69, 0.9)"
                }}
              >
                ログアウト
              </button>
            </div>
            <span style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "11px",
              fontWeight: "300"
            }}>
              ログイン中: {currentUser?.username} ({selectedTeam?.id})
            </span>
          </div>
        </div>
      </header>

      {/* タブナビゲーション（動的生成） */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
        borderBottom: "2px solid #ddd",
        flexWrap: "wrap"
      }}>
        {APP_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === tab.id ? "#007bff" : "#f8f9fa",
              color: activeTab === tab.id ? "white" : "#333",
              border: "1px solid #ddd",
              borderBottom: activeTab === tab.id ? "none" : "1px solid #ddd",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? "bold" : "normal",
              transition: "all 0.2s ease"
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ToDoリスト */}
      {activeTab === 'kaizen-plan' && (
        <>
          {canEdit() ? (
            <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>

              <button
                onClick={() => setShowKaizenForm(true)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🎯 カイゼン展開表の作成
              </button>

              <button
                onClick={async () => {
                  // ダミータスクを作成（独立報告書用）
                  const dummyTask = {
                    id: Date.now(),  // ユニークID（タイムスタンプ）
                    title: "独立活動報告書",
                    status: "independent",
                    kaizenData: {}
                  }

                  // 既存の番号生成ロジックを使用（タスク由来と統一）
                  const kaizenNumber = await generateKaizenNumber()

                  // 番号生成が保留された場合（初回設定モーダル表示中）
                  if (kaizenNumber === null) {
                    // モーダル完了後に再実行するためにフラグを設定
                    setSelectedKaizenTask(dummyTask)
                    return
                  }

                  // ダミータスクに番号を設定
                  dummyTask.kaizenData.kaizenNumber = kaizenNumber
                  setSelectedKaizenTask(dummyTask)

                  // reportDataを初期化
                  setReportData({
                    title: "",
                    kaizenNumber: kaizenNumber,
                    team: '',
                    period: "",
                    problem: "",
                    kaizenContent: "",
                    personInCharge: "",
                    place: "",
                    fiveSMethod: "",
                    kaizenEffect: "",
                    beforeImage: "",
                    afterImage: "",
                    progressComment: ""
                  })

                  setShowReportForm(true)
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                📝 活動報告書作成
              </button>

              <button
                onClick={() => setShowGanttChart(true)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#6f42c1",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                📅 カレンダー表示
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e9ecef", borderRadius: "8px", border: "1px solid #ced4da" }}>
              <p style={{ margin: 0, color: "#6c757d", textAlign: "center" }}>
                🔒 閲覧モード - 他チームのタスクを閲覧中です（編集権限なし）
              </p>
            </div>
          )}

          <div>
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <h2 style={{ color: "#007bff", margin: "0 0 10px 0" }}>🎯 MKG カイゼン管理看板ボード</h2>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                継続的改善によるムリ・ムラ・ムダの撲滅
              </p>
            </div>
        <div
          id="kaizen-task-board"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "20px",
            marginTop: "20px"
          }}>
          {/* TODO列 */}
          <div style={{
            backgroundColor: "#f8f9fa",
            padding: "15px",
            borderRadius: "8px",
            border: "2px solid #007bff"
          }}>
            <h3 style={{
              color: "#007bff",
              textAlign: "center",
              marginBottom: "15px"
            }}>
              📋 計画中 ({tasks.filter(t => t.status === "todo" && (t.team_id === selectedTeam?.id || t.teamId === selectedTeam?.id)).length})
            </h3>
            {tasks.filter(task => task.status === "todo" && (task.team_id === selectedTeam?.id || task.teamId === selectedTeam?.id)).map(task => (
              <div key={task.id} style={{
                padding: "10px",
                margin: "6px 0",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                minHeight: "80px",
                position: "relative"
              }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#333" }}>{task.title}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0 0 3px 0" }}>
                  <p style={{ margin: "0", fontSize: "0.9em", color: "#666" }}>
                    {getCategoryDisplay(task.category)}
                  </p>
                  {task.startDate && task.endDate && (
                    <p style={{ margin: "0", fontSize: "0.8em", color: "#007bff", fontWeight: "bold" }}>
                      📅 {task.startDate} ～ {task.endDate}
                    </p>
                  )}
                </div>
                {canEdit() && (
                  <div style={{ display: "flex", gap: "5px", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button
                        onClick={() => startEditTask(task)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#ffc107",
                          color: "black",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('本当にこのタスクを削除しますか？')) {
                            deleteTask(task.id)
                          }
                        }}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        削除
                      </button>
                    </div>
                    <button
                      onClick={() => handleStartTask(task.id)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1.2em",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#218838";
                        e.target.style.transform = "translateY(-2px)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#28a745";
                        e.target.style.transform = "translateY(0)";
                      }}
                    >
                      開始
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 進行中列 */}
          <div style={{
            backgroundColor: "#fff3cd",
            padding: "15px",
            borderRadius: "8px",
            border: "2px solid #ffc107",
            position: "relative"
          }}>
            {/* 期間設定ボタン（右上） */}
            <button
              onClick={() => setShowGanttChart(!showGanttChart)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                padding: "6px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.85em",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
                zIndex: 1
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#0056b3"
                e.target.style.transform = "scale(1.05)"
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#007bff"
                e.target.style.transform = "scale(1)"
              }}
            >
              📅 期間設定
            </button>

            <h3 style={{
              color: "#856404",
              textAlign: "center",
              marginBottom: "15px"
            }}>
              ⚡ 進行中 ({tasks.filter(t => t.status === "in-progress" && (t.team_id === selectedTeam?.id || t.teamId === selectedTeam?.id)).length})
            </h3>
            {tasks.filter(task => task.status === "in-progress" && (task.team_id === selectedTeam?.id || task.teamId === selectedTeam?.id)).map(task => (
              <div key={task.id} style={{
                padding: "10px",
                margin: "6px 0",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                minHeight: "80px",
                position: "relative"
              }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#333" }}>{task.title}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0 0 3px 0" }}>
                  <p style={{ margin: "0", fontSize: "0.9em", color: "#666" }}>
                    {getCategoryDisplay(task.category)}
                  </p>
                  {task.startDate && task.endDate && (
                    <p style={{ margin: "0", fontSize: "0.8em", color: "#007bff", fontWeight: "bold" }}>
                      📅 {task.startDate} ～ {task.endDate}
                    </p>
                  )}
                </div>
                {canEdit() && (
                  <div style={{ display: "flex", gap: "5px", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "5mm", alignItems: "center" }}>
                      <button
                        onClick={async () => {
                          // 🔧 Supabaseに保存
                          if (selectedTeam) {
                            const { error } = await supabase
                              .from('tasks')
                              .update({
                                status: 'todo',
                                start_date: null,
                                end_date: null
                              })
                              .eq('id', task.id)
                              .eq('team_id', selectedTeam.id)

                            if (error) {
                              console.error('❌ タスク戻すエラー:', error)
                              showToast('タスクを戻すのに失敗しました', 'error')
                              return
                            }
                            console.log('✅ タスク戻す完了:', task.id)
                          }

                          // ローカルステート更新
                          setTasks(tasks.map(t =>
                            t.id === task.id
                              ? { ...t, status: "todo", startDate: null, endDate: null }
                              : t
                          ))
                        }}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        戻る
                      </button>
                      <button
                        onClick={() => startEditTask(task)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#ffc107",
                          color: "black",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('本当にこのタスクを削除しますか？')) {
                            deleteTask(task.id)
                          }
                        }}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        削除
                      </button>
                      {task.reportInProgress && (
                        <span style={{ fontSize: "0.8em", color: "#dc3545", fontWeight: "bold", marginLeft: "8px" }}>
                          📝 報告書作成途中
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleTaskComplete(task.id)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#17a2b8",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1.2em",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#138496";
                        e.target.style.transform = "translateY(-2px)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#17a2b8";
                        e.target.style.transform = "translateY(0)";
                      }}
                    >
                      完了
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 完了列 */}
          <div style={{
            backgroundColor: "#d4edda",
            padding: "15px",
            borderRadius: "8px",
            border: "2px solid #28a745"
          }}>
            <h3 style={{ 
              color: "#155724", 
              textAlign: "center",
              marginBottom: "15px"
            }}>
              ✅ 完了 ({tasks.filter(t => t.status === "completed" && (t.team_id === selectedTeam?.id || t.teamId === selectedTeam?.id)).length})
            </h3>
            {tasks.filter(task => task.status === "completed" && (task.team_id === selectedTeam?.id || task.teamId === selectedTeam?.id)).map(task => (
              <div key={task.id} style={{
                padding: "10px",
                margin: "6px 0",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                opacity: 0.8,
                minHeight: "80px",
                position: "relative"
              }}>
                <h4 style={{
                  margin: "0 0 8px 0",
                  color: "#666",
                  textDecoration: "line-through"
                }}>
                  {task.title}
                </h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "0 0 3px 0" }}>
                  <p style={{ margin: "0", fontSize: "0.9em", color: "#666" }}>
                    {getCategoryDisplay(task.category)}
                  </p>
                  {task.startDate && task.endDate && (
                    <p style={{ margin: "0", fontSize: "0.8em", color: "#007bff", fontWeight: "bold" }}>
                      📅 {task.startDate} ～ {task.endDate}
                    </p>
                  )}
                </div>
                {canEdit() && (
                  <>
                    {/* 💡 編集は📊報告書一覧で行えます */}
                    <div style={{ marginBottom: "5px", textAlign: "center" }}>
                      <small style={{ color: "#6c757d", fontSize: "0.7em", fontStyle: "italic" }}>
                        💡 編集は📊報告書一覧で行えます
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: "5px", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button
                          onClick={() => moveTaskToInProgress(task.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            fontSize: "0.8em",
                            cursor: "pointer"
                          }}
                        >
                          戻る
                        </button>
                        <button
                          onClick={() => {
                            // 📊 報告書一覧タブに切り替えて該当報告書を表示
                            setActiveTab('activity-report')
                            // 報告書カードにフォーカスする視覚的ヒント（オプション）
                            setTimeout(() => {
                              console.log('📊 報告書一覧タブに切り替えました - タスクID:', task.id)
                            }, 100)
                          }}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            fontSize: "0.8em",
                            cursor: "pointer"
                          }}
                        >
                          📊 報告書を見る
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('本当にこのタスクを削除しますか？')) {
                            deleteTask(task.id)
                          }
                        }}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          cursor: "pointer"
                        }}
                      >
                        削除
                      </button>
                    </div>
                    {/* 透明ダミーボタン - 視覚的一貫性のため */}
                    <div style={{
                      padding: "8px 16px",
                      fontSize: "1.2em",
                      fontWeight: "bold",
                      borderRadius: "8px",
                      opacity: 0,
                      pointerEvents: "none"
                    }}>
                      完了
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>


          {/* カイゼン展開表フォームモーダル */}
          {showKaizenForm && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                width: "80%",
                maxWidth: "800px",
                maxHeight: "80vh",
                overflowY: "auto",
                position: "relative"
              }}>
                {/* 右上のキャンセルボタン */}
                <button
                  onClick={() => setShowKaizenForm(false)}
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: "15px",
                    padding: "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    zIndex: 1
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
                  title="フォームを閉じる"
                >
                  ✕
                </button>

                <h3>📋 カイゼン展開表作成</h3>
                
                <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "4px", border: "1px solid #b3d9ff" }}>
                  <p style={{ margin: 0, color: "#0056b3", fontWeight: "bold" }}>
                    作成チーム: {selectedTeam?.name} ({selectedTeam?.id})
                  </p>
                  <small style={{ color: "#0056b3" }}>
                    カイゼンナンバーは「{selectedTeam?.id}-{new Date().getFullYear().toString().slice(-2)}{String(new Date().getMonth() + 1).padStart(2, '0')}-0001」の形式で自動生成されます
                  </small>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>タイトル:</label>
                  <input
                    type="text"
                    value={kaizenForm.title}
                    onChange={(e) => {
                      const newForm = {...kaizenForm, title: e.target.value}
                      setKaizenForm(newForm)
                      updateCategorySuggestions(newForm)
                    }}
                    placeholder="改善活動のタイトル"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>担当者:</label>
                  <input
                    type="text"
                    value={kaizenForm.personInCharge}
                    onChange={(e) => setKaizenForm({...kaizenForm, personInCharge: e.target.value})}
                    placeholder="担当者名"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>場所:</label>
                  <input
                    type="text"
                    value={kaizenForm.place}
                    onChange={(e) => setKaizenForm({...kaizenForm, place: e.target.value})}
                    placeholder="例: 成形室"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>問題点:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(kaizenForm.problem, 'problem')
                        console.log('校正前:', kaizenForm.problem)
                        console.log('校正後:', correctedText)
                        const newForm = {...kaizenForm, problem: correctedText}
                        setKaizenForm(newForm)
                        updateCategorySuggestions(newForm)
                        console.log('フォーム更新完了:', newForm.problem)
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={kaizenForm.problem}
                    onChange={(e) => {
                      const newForm = {...kaizenForm, problem: e.target.value}
                      setKaizenForm(newForm)
                      updateCategorySuggestions(newForm)
                    }}
                    placeholder="現在の問題点を詳しく記述..."
                    style={{ width: "100%", minHeight: "100px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>カイゼン方法:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(kaizenForm.kaizenContent, 'kaizenContent')
                        const newForm = {...kaizenForm, kaizenContent: correctedText}
                        setKaizenForm(newForm)
                        updateCategorySuggestions(newForm)
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={kaizenForm.kaizenContent}
                    onChange={(e) => {
                      const newForm = {...kaizenForm, kaizenContent: e.target.value}
                      setKaizenForm(newForm)
                      updateCategorySuggestions(newForm)
                    }}
                    placeholder="改善の具体的な方法を記述..."
                    style={{ width: "100%", minHeight: "100px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カテゴリ:</label>
                  
                  {/* カテゴリ候補表示 */}
                  {categorySuggestions.length > 0 && (
                    <div style={{ 
                      marginBottom: "10px", 
                      padding: "10px", 
                      backgroundColor: "#f8f9fa", 
                      borderRadius: "4px",
                      border: "1px solid #dee2e6"
                    }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: "0.9em", color: "#495057", fontWeight: "bold" }}>
                        💡 入力内容から推奨カテゴリ:
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {categorySuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.category.id}
                            type="button"
                            onClick={() => setKaizenForm({...kaizenForm, fiveSMethod: suggestion.category.id})}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: kaizenForm.fiveSMethod === suggestion.category.id ? "#007bff" : "#e9ecef",
                              color: kaizenForm.fiveSMethod === suggestion.category.id ? "white" : "#495057",
                              border: "1px solid " + (kaizenForm.fiveSMethod === suggestion.category.id ? "#007bff" : "#ced4da"),
                              borderRadius: "3px",
                              fontSize: "0.8em",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>{suggestion.category.icon} {suggestion.category.name}</span>
                            <span style={{ 
                              backgroundColor: "rgba(0,0,0,0.1)", 
                              borderRadius: "10px", 
                              padding: "2px 6px", 
                              fontSize: "0.7em" 
                            }}>
                              {suggestion.score}pt
                            </span>
                          </button>
                        ))}
                      </div>
                      <p style={{ margin: "6px 0 0 0", fontSize: "0.7em", color: "#6c757d" }}>
                        マッチしたキーワード: {categorySuggestions[0].matchedKeywords.join(', ')}
                      </p>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={kaizenForm.fiveSMethod}
                      onChange={(e) => setKaizenForm({...kaizenForm, fiveSMethod: e.target.value})}
                      style={{ flex: "1", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    >
                      <option value="">選択してください</option>
                      {kaizenCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name} ({category.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const result = detectBestCategory(kaizenForm.title, kaizenForm.problem, kaizenForm.kaizenContent)
                        if (result) {
                          setKaizenForm({...kaizenForm, fiveSMethod: result.category.id})
                          showToast(`${result.category.icon} ${result.category.name} を選択しました。\n\n判定理由: ${result.reason}`, 'info')
                        } else {
                          showToast('入力内容から適切なカテゴリを判定できませんでした。手動で選択してください。', 'info')
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.9em",
                        whiteSpace: "nowrap"
                      }}
                    >
                      🤖 自動選択
                    </button>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowKaizenForm(false)}
                    style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleKaizenFormSubmit}
                    style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    作成
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* タスク編集フォーム */}
          {showEditTaskForm && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                width: "500px",
                maxHeight: "80vh",
                overflowY: "auto"
              }}>
                <h2 style={{ marginTop: 0, color: "#333", borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>
                  タスク編集
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>タイトル:</label>
                    <input
                      type="text"
                      value={editTaskForm.title}
                      onChange={(e) => setEditTaskForm({...editTaskForm, title: e.target.value})}
                      placeholder="タスクのタイトルを入力"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>担当者:</label>
                    <input
                      type="text"
                      value={editTaskForm.personInCharge}
                      onChange={(e) => setEditTaskForm({...editTaskForm, personInCharge: e.target.value})}
                      placeholder="例: 田中太郎"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>場所:</label>
                  <input
                    type="text"
                    value={editTaskForm.place}
                    onChange={(e) => setEditTaskForm({...editTaskForm, place: e.target.value})}
                    placeholder="例: 成形室"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ marginTop: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>問題点:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(editTaskForm.problem, 'problem')
                        setEditTaskForm({...editTaskForm, problem: correctedText})
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={editTaskForm.problem}
                    onChange={(e) => setEditTaskForm({...editTaskForm, problem: e.target.value})}
                    placeholder="現在の問題点を記述してください"
                    style={{ width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                <div style={{ marginTop: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>改善内容:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(editTaskForm.kaizenContent, 'kaizenContent')
                        setEditTaskForm({...editTaskForm, kaizenContent: correctedText})
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={editTaskForm.kaizenContent}
                    onChange={(e) => setEditTaskForm({...editTaskForm, kaizenContent: e.target.value})}
                    placeholder="改善内容を記述してください"
                    style={{ width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                <div style={{ marginTop: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カテゴリ:</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={editTaskForm.fiveSMethod}
                      onChange={(e) => setEditTaskForm({...editTaskForm, fiveSMethod: e.target.value})}
                      style={{ flex: "1", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    >
                      <option value="">選択してください</option>
                      {kaizenCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const result = detectBestCategory(editTaskForm.title, editTaskForm.problem, editTaskForm.kaizenContent)
                        if (result) {
                          setEditTaskForm({...editTaskForm, fiveSMethod: result.category.id})
                          showToast(`${result.category.icon} ${result.category.name} を選択しました。\n\n判定理由: ${result.reason}`, 'info')
                        } else {
                          showToast('入力内容から適切なカテゴリを判定できませんでした。手動で選択してください。', 'info')
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.9em",
                        whiteSpace: "nowrap"
                      }}
                    >
                      🤖 自動選択
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button
                    onClick={cancelEditTask}
                    style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={updateTask}
                    style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    更新
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 期間設定モーダル */}
          {showDateModal && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                width: "400px"
              }}>
                <h3>📅 期間設定</h3>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>開始日:</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => document.getElementById('start-date-input')?.showPicker()}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
                    >
                      📅 カレンダーから設定
                    </button>
                    <style dangerouslySetInnerHTML={{__html: `
                      #start-date-input::-webkit-calendar-picker-indicator,
                      #end-date-input::-webkit-calendar-picker-indicator {
                        display: none;
                      }
                    `}} />
                    <input
                      id="start-date-input"
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>終了日:</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => document.getElementById('end-date-input')?.showPicker()}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
                    >
                      📅 カレンダーから設定
                    </button>
                    <input
                      id="end-date-input"
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowDateModal(false)}
                    style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDateSubmit}
                    style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 初回番号設定モーダル */}
          {showNumberSetupModal && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                minWidth: "500px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
              }}>
                <h3 style={{ marginBottom: "20px", color: "#007bff" }}>
                  🔢 チーム初回番号設定
                </h3>
                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "5px",
                  marginBottom: "20px",
                  border: "1px solid #dee2e6"
                }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#495057" }}>
                    <strong>チーム:</strong> {selectedTeam?.name} ({selectedTeam?.id})
                  </p>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#495057" }}>
                    このチームで初めて活動報告書を作成します。<br/>
                    基準となる番号を入力してください。
                  </p>
                  <p style={{ margin: 0, fontSize: "15px", color: "#6c757d" }}>
                    例: GR-2507-0360 (チームID-年月-積算番号)
                  </p>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                    基準番号を入力:
                  </label>
                  <input
                    type="text"
                    value={initialNumberInput}
                    onChange={(e) => setInitialNumberInput(e.target.value.toUpperCase())}
                    placeholder={`${selectedTeam?.id}-2507-0360`}
                    style={{
                      width: "100%",
                      padding: "16px",
                      border: "2px solid #007bff",
                      borderRadius: "4px",
                      fontSize: "15px",
                      fontFamily: "monospace"
                    }}
                  />
                  <small style={{ color: "#6c757d", fontSize: "15px" }}>
                    形式: チームID-年月-4桁番号 (例: {selectedTeam?.id}-2507-0360)
                  </small>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setShowNumberSetupModal(false)
                      setInitialNumberInput('')
                    }}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleInitialNumberSetup}
                    disabled={!initialNumberInput.trim()}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: initialNumberInput.trim() ? "#28a745" : "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: initialNumberInput.trim() ? "pointer" : "not-allowed"
                    }}
                  >
                    設定して継続
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* APIキー設定モーダル */}
          {(() => {
            console.log('🔍 モーダル表示条件チェック:')
            console.log('  - aiConsultation:', aiConsultation)
            console.log('  - showApiKeySetup:', aiConsultation.showApiKeySetup)
            console.log('  - 表示する?:', !!aiConsultation.showApiKeySetup)
            return aiConsultation.showApiKeySetup
          })() && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                minWidth: "500px",
                maxWidth: "600px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
              }}>
                <h3 style={{ marginBottom: "20px", color: "#007bff" }}>
                  🔑 Claude APIキー設定
                </h3>
                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "5px",
                  marginBottom: "20px",
                  border: "1px solid #dee2e6"
                }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#495057" }}>
                    <strong>Claude APIキーを設定してください</strong>
                  </p>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#495057" }}>
                    1. <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{color: "#007bff"}}>Anthropic Console</a> でアカウント作成<br/>
                    2. APIキーを生成<br/>
                    3. 下記にキーを入力
                  </p>
                  <p style={{ margin: 0, fontSize: "15px", color: "#6c757d" }}>
                    ⚠️ APIキーは安全に管理してください。他人に教えないでください。
                  </p>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                    Claude APIキー:
                  </label>
                  <input
                    type="password"
                    placeholder="sk-ant-api..."
                    onChange={(e) => {
                      const inputKey = e.target.value
                      setAiConsultation(prev => ({ ...prev, tempApiKey: inputKey }))
                    }}
                    style={{
                      width: "100%",
                      padding: "16px",
                      border: "2px solid #007bff",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "monospace"
                    }}
                  />
                  <small style={{ color: "#6c757d", fontSize: "15px" }}>
                    形式: sk-ant-api-... で始まるキー
                  </small>
                </div>
                <div style={{
                  backgroundColor: "#e7f3ff",
                  padding: "16px",
                  borderRadius: "5px",
                  marginBottom: "20px",
                  border: "1px solid #bee5eb"
                }}>
                  <p style={{ margin: "0", fontSize: "13px", color: "#0c5460" }}>
                    💡 <strong>セキュリティ情報:</strong><br/>
                    • APIキーはこのデバイスにのみ保存されます<br/>
                    • 他のデバイスでは再設定が必要です<br/>
                    • 定期的にキーの安全性を確認してください
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setAiConsultation(prev => ({ ...prev, showApiKeySetup: false, tempApiKey: '' }))}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      const tempKey = aiConsultation.tempApiKey
                      if (tempKey && tempKey.startsWith('sk-ant-api')) {
                        handleApiKeySetup(tempKey)
                        setAiConsultation(prev => ({ ...prev, tempApiKey: '' }))
                      } else {
                        showToast('正しいClaude APIキー形式ではありません。sk-ant-api- で始まるキーを入力してください。', 'error')
                      }
                    }}
                    disabled={!aiConsultation.tempApiKey?.startsWith('sk-ant-api')}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: aiConsultation.tempApiKey?.startsWith('sk-ant-api') ? "#28a745" : "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: aiConsultation.tempApiKey?.startsWith('sk-ant-api') ? "pointer" : "not-allowed"
                    }}
                  >
                    設定完了
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* タスク完了時の活動報告書作成フォーム */}
          {/* カレンダー表示モーダル */}
          {showGanttChart && (() => {
            const { calendar, year, month, firstDay, lastDay } = generateCalendar(currentCalendarDate)
            const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
            const dayNames = ["日", "月", "火", "水", "木", "金", "土"]
            
            return (
              <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: "white",
                  padding: "30px",
                  borderRadius: "8px",
                  width: "95%",
                  maxWidth: "1000px",
                  maxHeight: "85vh",
                  overflowY: "auto"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentCalendarDate)
                          newDate.setFullYear(newDate.getFullYear() - 1)
                          setCurrentCalendarDate(newDate)
                        }}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold"
                        }}
                      >
                        ❮❮
                      </button>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentCalendarDate)
                          newDate.setMonth(newDate.getMonth() - 1)
                          setCurrentCalendarDate(newDate)
                        }}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        ❮
                      </button>
                      <h3 style={{ margin: 0 }}>📅 カレンダービュー - {year}年{monthNames[month]}</h3>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentCalendarDate)
                          newDate.setMonth(newDate.getMonth() + 1)
                          setCurrentCalendarDate(newDate)
                        }}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        ❯
                      </button>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentCalendarDate)
                          newDate.setFullYear(newDate.getFullYear() + 1)
                          setCurrentCalendarDate(newDate)
                        }}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold"
                        }}
                      >
                        ❯❯
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setCurrentCalendarDate(new Date())}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#ffc107",
                          color: "#212529",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold"
                        }}
                      >
                        今月
                      </button>
                      <button
                        onClick={() => setShowGanttChart(false)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                  
                  {/* カレンダーグリッド */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "1px",
                    backgroundColor: "#ddd",
                    border: "1px solid #ddd"
                  }}>
                    {/* 曜日ヘッダー */}
                    {dayNames.map(day => (
                      <div key={day} style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "0.9em"
                      }}>
                        {day}
                      </div>
                    ))}
                    
                    {/* カレンダーの日付 */}
                    {calendar.map(date => {
                      const isCurrentMonth = date.getMonth() === month
                      const tasksForDate = getTasksForDate(date)
                      const dateStr = date.toISOString().split('T')[0]
                      const isToday = dateStr === new Date().toISOString().split('T')[0]
                      
                      return (
                        <div key={dateStr} style={{
                          padding: "8px",
                          backgroundColor: "white",
                          minHeight: "80px",
                          border: isToday ? "2px solid #007bff" : "none",
                          opacity: isCurrentMonth ? 1 : 0.3
                        }}>
                          <div style={{
                            fontWeight: isToday ? "bold" : "normal",
                            color: isToday ? "#007bff" : isCurrentMonth ? "#333" : "#999",
                            marginBottom: "4px",
                            fontSize: "0.9em"
                          }}>
                            {date.getDate()}
                          </div>
                          
                          {/* その日のタスク */}
                          {tasksForDate.map(task => (
                            <div key={task.id} style={{
                              backgroundColor: task.status === "in-progress" ? "#ffc107" : "#28a745",
                              color: "white",
                              padding: "2px 4px",
                              margin: "2px 0",
                              borderRadius: "3px",
                              fontSize: "0.7em",
                              cursor: "pointer",
                              position: "relative"
                            }}
                            onClick={() => {
                              // タスクの期間編集
                              const newStartDate = prompt("開始日 (YYYY-MM-DD):", task.startDate)
                              const newEndDate = prompt("終了日 (YYYY-MM-DD):", task.endDate)
                              if (newStartDate && newEndDate && newStartDate <= newEndDate) {
                                updateTaskDates(task.id, newStartDate, newEndDate)
                              }
                            }}
                            >
                              <div style={{ 
                                fontWeight: "bold",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {task.title}
                              </div>
                              {task.startDate === dateStr && (
                                <div style={{ fontSize: "0.6em", opacity: 0.8 }}>開始</div>
                              )}
                              {task.endDate === dateStr && (
                                <div style={{ fontSize: "0.6em", opacity: 0.8 }}>終了</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 凡例 */}
                  <div style={{ marginTop: "20px", display: "flex", gap: "20px", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "15px", height: "15px", backgroundColor: "#ffc107", borderRadius: "3px" }}></div>
                      <span style={{ fontSize: "0.9em" }}>進行中</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "15px", height: "15px", backgroundColor: "#28a745", borderRadius: "3px" }}></div>
                      <span style={{ fontSize: "0.9em" }}>完了</span>
                    </div>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>
                      ※ タスクをクリックすると期間編集できます
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
      </>
      )}

      {/* 活動報告書 */}
      {activeTab === 'activity-report' && (
        <div style={{ position: "relative" }}>
          <h2>報告書一覧表</h2>

          {/* フィルタータブ */}
          <div style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
            borderBottom: "2px solid #dee2e6"
          }}>
            <button
              onClick={() => setReportFilter('completed')}
              style={{
                padding: "10px 20px",
                backgroundColor: reportFilter === 'completed' ? "#007bff" : "transparent",
                color: reportFilter === 'completed' ? "white" : "#666",
                border: "none",
                borderBottom: reportFilter === 'completed' ? "3px solid #007bff" : "none",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "bold",
                transition: "all 0.2s ease"
              }}
            >
              ✅ 完成版
            </button>
            <button
              onClick={() => setReportFilter('draft')}
              style={{
                padding: "10px 20px",
                backgroundColor: reportFilter === 'draft' ? "#ffc107" : "transparent",
                color: reportFilter === 'draft' ? "black" : "#666",
                border: "none",
                borderBottom: reportFilter === 'draft' ? "3px solid #ffc107" : "none",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "bold",
                transition: "all 0.2s ease"
              }}
            >
              📝 下書き
            </button>
          </div>

          <div style={{
            backgroundColor: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #dee2e6"
          }}>
            <div style={{ marginBottom: "20px", textAlign: "center", color: "#666" }}>
              {reportFilter === 'completed' ? (
                <>
                  <p>完成した活動報告書の一覧です。</p>
                  <p>報告書をクリックして閲覧・編集できます。</p>
                </>
              ) : (
                <>
                  <p>下書き保存された報告書の一覧です。</p>
                  <p>編集を続けて、完成したら「保存」で改善№が付与されます。</p>
                </>
              )}
            </div>

            <div className="report-cards-grid" style={{
              display: "grid",
              gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
              gap: "15px"
            }}>
              {/* フィルター済み報告書を表示 */}
              {completedReports
                .filter(report =>
                  report.teamId === selectedTeam?.id &&
                  (reportFilter === 'completed' ? !report.isDraft : report.isDraft)
                )
                .map(report => {
                  const isExpanded = expandedReportCards[report.id]

                  return (
                  <div
                    key={report.id}
                    onClick={() => {
                      // スマホ版のみクリックでカード展開
                      if (isMobileView) {
                        setExpandedReportCards(prev => ({
                          ...prev,
                          [report.id]: !prev[report.id]
                        }))
                      }
                    }}
                    style={{
                      backgroundColor: "white",
                      border: report.isDraft ? "2px solid #ffc107" : "1px solid #dee2e6",
                      borderRadius: "8px",
                      padding: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      opacity: 1,
                      position: "relative",
                      cursor: isMobileView ? "pointer" : "default",
                      transition: "all 0.3s ease",
                    }}>
                    {/* 📱 スマホ版表示 */}
                    {isMobileView ? (
                      <>
                        {/* 簡略表示（常に表示） */}
                        <div style={{ padding: "8px" }}>
                          {/* 下書きバッジ */}
                          {report.isDraft && (
                            <div style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              backgroundColor: "#ffc107",
                              color: "black",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              marginBottom: "8px"
                            }}>
                              📝 下書き
                            </div>
                          )}

                          {/* 改善№ */}
                          <div style={{
                            color: "#28a745",
                            fontSize: "1.2em",
                            fontWeight: "bold",
                            marginBottom: "6px"
                          }}>
                            {report.reportNumber || '番号未設定'}
                          </div>

                          {/* タイトル */}
                          <div style={{
                            fontSize: "1.1em",
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: "6px",
                            wordBreak: "break-word"
                          }}>
                            {report.title}
                          </div>

                          {/* 担当者 */}
                          <div style={{
                            fontSize: "0.9em",
                            color: "#666",
                            marginBottom: "8px"
                          }}>
                            担当者: {report.reportData?.personInCharge}
                          </div>

                          {/* タップ指示 */}
                          <div style={{
                            fontSize: "0.75em",
                            color: "#999",
                            textAlign: "center",
                            padding: "4px"
                          }}>
                            {isExpanded ? "▲ タップで閉じる" : "▼ タップで詳細表示"}
                          </div>
                        </div>

                        {/* 展開時の詳細情報とボタン */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              borderTop: "1px solid #dee2e6",
                              padding: "12px",
                              backgroundColor: "#f8f9fa"
                            }}
                          >
                            {/* アクションボタン */}
                            <div style={{
                              display: "flex",
                              gap: "8px",
                              marginBottom: "12px",
                              flexWrap: "wrap"
                            }}>
                              {/* 編集・閲覧ボタン */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const reportDataToEdit = {
                                    title: report.title,
                                    team: report.reportData?.team || '',
                                    kaizenNumber: report.kaizenNumber,
                                    reportNumber: report.reportNumber,
                                    period: report.reportData?.period || '',
                                    problem: report.reportData?.problem || '',
                                    kaizenContent: report.reportData?.kaizenContent || '',
                                    personInCharge: report.reportData?.personInCharge || '',
                                    place: report.reportData?.place || '',
                                    fiveSMethod: report.reportData?.fiveSMethod || '',
                                    kaizenEffect: report.reportData?.kaizenEffect || '',
                                    beforeImage: report.reportData?.beforeImage || '',
                                    afterImage: report.reportData?.afterImage || '',
                                    progressComment: report.reportData?.progressComment || ''
                                  }
                                  setReportData(reportDataToEdit)
                                  setSelectedKaizenTask(report)
                                  setReportEditSource(report.isDraft ? 'report' : 'view')
                                  setShowReportForm(true)
                                }}
                                style={{
                                  flex: 1,
                                  padding: "12px",
                                  backgroundColor: "#007bff",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  fontWeight: "bold"
                                }}
                              >
                                📝 編集・閲覧
                              </button>

                              {/* 削除ボタン */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const confirmMessage = `「${report.title}」\n改善No. ${report.reportNumber || '未設定'}\n\nこの報告書を完全に削除しますか？\n（復元できないのでご注意ください）`
                                  if (window.confirm(confirmMessage)) {
                                    const { error } = await supabase
                                      .from('completed_reports')
                                      .delete()
                                      .eq('task_id', report.originalTaskId)
                                      .eq('team_id', selectedTeam.id)

                                    if (error) {
                                      console.error('❌ 報告書削除エラー:', error)
                                      showToast('報告書の削除に失敗しました', 'error')
                                    } else {
                                      console.log('🗑️ 報告書削除完了:', report.kaizenNumber)
                                      const savedReports = await loadActivityReportsFromSupabase()
                                      setCompletedReports(savedReports)
                                    }
                                  }
                                }}
                                style={{
                                  padding: "12px 20px",
                                  backgroundColor: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  fontWeight: "bold"
                                }}
                              >
                                🗑️ 削除
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 💻 PC版表示（従来通り） */}
                        {/* 📝 下書きバッジ */}
                        {report.isDraft && (
                          <div style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            padding: "4px 8px",
                            backgroundColor: "#ffc107",
                            color: "black",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            zIndex: 1
                          }}>
                            📝 下書き
                          </div>
                        )}

                        {/* 📝 右上の編集・閲覧ボタン（削除ボタンの左） */}
                        <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // 報告書データを設定
                        const reportDataToEdit = {
                          title: report.title,
                          team: report.reportData?.team || '',
                          kaizenNumber: report.kaizenNumber,
                          reportNumber: report.reportNumber,
                          period: report.reportData?.period || '',
                          problem: report.reportData?.problem || '',
                          kaizenContent: report.reportData?.kaizenContent || '',
                          personInCharge: report.reportData?.personInCharge || '',
                          place: report.reportData?.place || '',
                          fiveSMethod: report.reportData?.fiveSMethod || '',
                          kaizenEffect: report.reportData?.kaizenEffect || '',
                          beforeImage: report.reportData?.beforeImage || '',
                          afterImage: report.reportData?.afterImage || '',
                          progressComment: report.reportData?.progressComment || ''
                        }
                        setReportData(reportDataToEdit)
                        setSelectedKaizenTask(report)
                        // 下書きは編集モード、完成版は閲覧モード
                        setReportEditSource(report.isDraft ? 'report' : 'view')
                        setShowReportForm(true)
                      }}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "100px",
                        padding: "4px 8px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        opacity: 0.8,
                        transition: "all 0.2s ease",
                        zIndex: 1
                      }}
                      onMouseOver={(e) => {
                        e.target.style.opacity = "1"
                        e.target.style.transform = "scale(1.05)"
                      }}
                      onMouseOut={(e) => {
                        e.target.style.opacity = "0.8"
                        e.target.style.transform = "scale(1)"
                      }}
                      title="報告書を編集・閲覧"
                    >
                      📝 編集・閲覧
                    </button>

                    {/* ✖️ 右上の削除ボタン */}
                    <button
                      onClick={async () => {
                        const confirmMessage = `「${report.title}」\n改善No. ${report.reportNumber || '未設定'}\n\nこの報告書を完全に削除しますか？\n（復元できないのでご注意ください）`
                        if (window.confirm(confirmMessage)) {
                          // Supabaseから削除
                          const { error } = await supabase
                            .from('completed_reports')
                            .delete()
                            .eq('task_id', report.originalTaskId)
                            .eq('team_id', selectedTeam.id)

                          if (error) {
                            console.error('❌ 報告書削除エラー:', error)
                            showToast('報告書の削除に失敗しました', 'error')
                          } else {
                            console.log('🗑️ 報告書削除完了:', report.kaizenNumber)
                            // Supabaseから最新データを再読み込み
                            const savedReports = await loadActivityReportsFromSupabase()
                            setCompletedReports(savedReports)
                          }
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "transparent",
                        color: "#dc3545",
                        border: "2px solid #dc3545",
                        borderRadius: "50%",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.7,
                        transition: "all 0.2s ease",
                        zIndex: 1
                      }}
                      onMouseOver={(e) => {
                        e.target.style.opacity = "1"
                        e.target.style.transform = "scale(1.1)"
                        e.target.style.backgroundColor = "#dc3545"
                        e.target.style.color = "white"
                      }}
                      onMouseOut={(e) => {
                        e.target.style.opacity = "0.7"
                        e.target.style.transform = "scale(1)"
                        e.target.style.backgroundColor = "transparent"
                        e.target.style.color = "#dc3545"
                      }}
                      title="報告書を削除"
                    >
                      ✕
                    </button>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {/* カード上部：コンパクト情報表示 */}
                      <div style={{ marginBottom: "12px" }}>
                        {/* 1行目：改善番号 + タイトル */}
                        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "5px" }}>
                          <strong style={{
                            color: "#28a745",
                            fontSize: "1.1em",
                            marginRight: "10px",
                            flexShrink: 0
                          }}>
                            {report.reportNumber || '番号未設定'}
                          </strong>
                          <h3 style={{
                            margin: "0",
                            color: "#333",
                            fontSize: "1.1em",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {report.title}
                          </h3>
                        </div>
                        {/* 2行目：担当者 */}
                        <div style={{
                          fontSize: "0.9em",
                          color: "#666"
                        }}>
                          <span>担当者: {report.reportData?.personInCharge}</span>
                        </div>
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                  )
                })
              }
            </div>


          </div>
        </div>
      )}
      
      {/* プレビュー表示はタスク完了時の統一された画面で処理される */}

      {/* AI改善相談 */}
      {activeTab === 'ai-consultation' && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2>🤖 AI改善相談</h2>
            <div style={{
              padding: "8px 16px",
              backgroundColor: "#e7f3ff",
              color: "#0056b3",
              border: "1px solid #b3d9ff",
              borderRadius: "4px",
              fontSize: "14px"
            }}>
              💡 個人のメールアドレスでClaude.aiにアクセスできます
            </div>
          </div>

          {/* 改善相談テンプレート入力エリア */}
          <div style={{ marginBottom: "20px" }}>
            <h3>📝 改善相談テンプレート</h3>
            <div style={{
              border: "2px solid #dee2e6",
              borderRadius: "8px",
              backgroundColor: "white",
              padding: "0"
            }}>
              <div style={{
                backgroundColor: "#f8f9fa",
                padding: "15px",
                borderBottom: "1px solid #dee2e6",
                fontSize: "14px",
                color: "#666"
              }}>
                💡 ボタンを押すだけで改善相談を開始できます
              </div>

              {/* ここに叶さんが作成するテンプレートを表示 */}
              <div style={{ padding: "20px" }}>
                {promptData.isLoading ? (
                  <div style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "20px"
                  }}>
                    <div style={{ color: "#6c757d" }}>
                      🔄 プロンプトを読み込み中...
                    </div>
                  </div>
                ) : promptData.error ? (
                  <div style={{
                    backgroundColor: "#f8d7da",
                    border: "1px solid #f5c6cb",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "20px"
                  }}>
                    <div style={{ color: "#721c24", fontWeight: "bold" }}>
                      ❌ プロンプト読み込みエラー
                    </div>
                    <div style={{ color: "#721c24", fontSize: "14px", marginTop: "8px" }}>
                      {promptData.error}
                    </div>
                    <button
                      onClick={loadPromptFromFile}
                      style={{
                        marginTop: "10px",
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      再読み込み
                    </button>
                  </div>
                ) : promptData.content ? (
                  <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <button
                      onClick={() => {
                        // プロンプトをクリップボードにコピー
                        navigator.clipboard.writeText(promptData.content).then(() => {
                          // Claude.aiを新しいタブで開く
                          window.open('https://claude.ai', '_blank')
                          showToast('✅ プロンプトをコピーしました！Claude.aiが開いたら、チャット欄にプロンプトを貼り付けて改善相談を開始してください。', 'success')
                        }).catch(() => {
                          showToast('❌ コピーに失敗しました。再試行してください。', 'error')
                        })
                      }}
                      style={{
                        padding: "20px 40px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "15px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 3px 6px rgba(0,0,0,0.1)"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#1e7e34"
                        e.target.style.transform = "translateY(-2px)"
                        e.target.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)"
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#28a745"
                        e.target.style.transform = "translateY(0)"
                        e.target.style.boxShadow = "0 3px 6px rgba(0,0,0,0.1)"
                      }}
                    >
                      🤖 AIに相談
                    </button>

                    <div style={{
                      marginTop: "20px",
                      color: "#6c757d",
                      fontSize: "14px",
                      lineHeight: "1.6"
                    }}>
                      プロンプトがコピーされ、Claude.aiが開きます<br />
                      ブラウザでプロンプトを貼り付けて相談を開始してください
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: "#fff3cd",
                    border: "1px solid #ffeaa7",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "20px"
                  }}>
                    <div style={{ color: "#856404", fontWeight: "bold" }}>
                      ⚠️ プロンプトが見つかりません
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>


          {/* Claude.ai回答受信エリア */}
          <div style={{ marginBottom: "20px" }}>
            <h3>📥 Claude.ai回答受信エリア</h3>
            <div style={{
              border: "2px solid #28a745",
              borderRadius: "8px",
              backgroundColor: "white",
              padding: "0"
            }}>
              <div style={{
                backgroundColor: "#d4edda",
                padding: "15px",
                borderBottom: "1px solid #c3e6cb",
                fontSize: "14px",
                color: "#155724"
              }}>
                💡 Claude.aiからの回答をここにペーストしてください
              </div>

              <div style={{ padding: "20px" }}>
                <textarea
                  value={aiConsultation.claudeResponse || ''}
                  onChange={(e) => setAiConsultation(prev => ({ ...prev, claudeResponse: e.target.value }))}
                  placeholder="Claude.aiからの改善提案をここにペーストしてください..."
                  style={{
                    width: "100%",
                    minHeight: "200px",
                    padding: "15px",
                    border: "1px solid #ced4da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    resize: "vertical",
                    outline: "none",
                    lineHeight: "1.6",
                    fontFamily: "inherit"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#28a745"}
                  onBlur={(e) => e.target.style.borderColor = "#ced4da"}
                />

                {/* カイゼン展開表作成ボタン */}
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    onClick={() => {
                      if (!aiConsultation.claudeResponse?.trim()) {
                        showToast('Claude.aiの回答を入力してからボタンを押してください。', 'warning')
                        return
                      }

                      // Claude.aiの回答を解析してカイゼン展開表に分割
                      const parseClaudeResponse = (response) => {
                        console.log('🔍 Claude回答解析開始:', response)

                        const result = {
                          title: '',
                          problem: '',
                          kaizenContent: '',
                          personInCharge: currentUser?.username || ''
                        }

                        // ■タイトルを抽出（複数パターン対応）
                        const titlePatterns = [
                          /■\s*タイトル[：:]?\s*\n?\s*(.+?)(?=\n■|$)/i,
                          /タイトル[：:]?\s*\n?\s*(.+?)(?=\n■|$)/i,
                          /^(.+?)(?=\n\n|\n■)/m, // 最初の行をタイトルとして抽出
                          /【(.+?)】/g, // 【】で囲まれた部分
                          /##?\s*(.+?)(?=\n)/g // マークダウン形式のヘッダー
                        ]

                        for (const pattern of titlePatterns) {
                          const titleMatch = response.match(pattern)
                          if (titleMatch && titleMatch[1]) {
                            const extractedTitle = titleMatch[1].trim()
                            // 意味のあるタイトルかチェック
                            if (extractedTitle.length > 3 && !extractedTitle.includes('タイトル') && !extractedTitle.includes('以下')) {
                              result.title = extractedTitle
                              console.log('✅ タイトル抽出成功:', result.title)
                              break
                            }
                          }
                        }

                        // ■問題点を抽出（コロンありなし両方対応）
                        const problemMatch = response.match(/■\s*問題点[：:]?\s*\n?\s*([\s\S]*?)(?=\n■|$)/i) ||
                                            response.match(/問題点[：:]?\s*\n?\s*([\s\S]*?)(?=\n■|$)/i)
                        if (problemMatch) {
                          result.problem = problemMatch[1].trim()
                          console.log('✅ 問題点抽出成功:', result.problem)
                        }

                        // ■カイゼン方法を抽出（コロンありなし両方対応）
                        const kaizenMatch = response.match(/■\s*(?:カイゼン方法|改善方法)[：:]?\s*\n?\s*([\s\S]*?)(?=\n■|$)/i) ||
                                          response.match(/(?:カイゼン方法|改善方法)[：:]?\s*\n?\s*([\s\S]*?)(?=\n■|$)/i)
                        if (kaizenMatch) {
                          result.kaizenContent = kaizenMatch[1].trim()
                          console.log('✅ カイゼン方法抽出成功:', result.kaizenContent)
                        }

                        // ■担当者を抽出（コロンありなし両方対応）
                        const personMatch = response.match(/■\s*担当者[：:]?\s*\n?\s*(.+?)(?=\n■|$)/i) ||
                                          response.match(/担当者[：:]?\s*\n?\s*(.+?)(?=\n■|$)/i)
                        if (personMatch) {
                          const person = personMatch[1].trim()
                          if (person && !person.includes('[担当者名を入力してください]')) {
                            result.personInCharge = person
                            console.log('✅ 担当者抽出成功:', result.personInCharge)
                          }
                        }

                        // フィールドが空の場合のフォールバック処理
                        if (!result.title && !result.problem && !result.kaizenContent) {
                          // 構造化されていない場合は全体を改善方法として扱う
                          result.title = '改善提案（AI相談結果）'
                          result.problem = '（AI相談内容より）'
                          result.kaizenContent = response
                        }

                        console.log('🔍 解析結果:', result)
                        return result
                      }

                      const parsedData = parseClaudeResponse(aiConsultation.claudeResponse)
                      console.log('📝 最終的なカイゼンデータ:', parsedData)

                      // カイゼン展開表のデータを準備
                      const kaizenData = {
                        title: parsedData.title || '改善提案（AI相談結果）',
                        personInCharge: parsedData.personInCharge || currentUser?.username || '',
                        place: '',
                        fiveSMethod: '',
                        problem: parsedData.problem || aiConsultation.inputText || '相談内容',
                        kaizenContent: parsedData.kaizenContent || aiConsultation.claudeResponse,
                        fromAiConsultation: true,
                        aiConsultationDate: new Date().toLocaleString('ja-JP')
                      }

                      // カイゼンフォームにデータを設定
                      setKaizenForm(kaizenData)

                      // カテゴリの自動判定を実行
                      updateCategorySuggestions(kaizenData)

                      setShowKaizenForm(true)

                      // Claude.ai回答受信エリアをクリア
                      setAiConsultation(prev => ({ ...prev, claudeResponse: '' }))

                      showToast('Claude.aiの回答をカイゼン展開表の各項目に自動分割しました！', 'success')
                    }}
                    disabled={!aiConsultation.claudeResponse?.trim()}
                    style={{
                      padding: "15px 30px",
                      backgroundColor: aiConsultation.claudeResponse?.trim() ? "#007bff" : "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontWeight: "bold",
                      cursor: aiConsultation.claudeResponse?.trim() ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                    onMouseOver={(e) => {
                      if (aiConsultation.claudeResponse?.trim()) {
                        e.target.style.backgroundColor = "#0056b3"
                        e.target.style.transform = "translateY(-2px)"
                        e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)"
                      }
                    }}
                    onMouseOut={(e) => {
                      if (aiConsultation.claudeResponse?.trim()) {
                        e.target.style.backgroundColor = "#007bff"
                        e.target.style.transform = "translateY(0)"
                        e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
                      }
                    }}
                  >
                    📊 カイゼン展開表作成
                  </button>
                </div>

                {/* クリアボタン */}
                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <button
                    onClick={() => {
                      if (confirm('入力した内容をクリアしますか？')) {
                        setAiConsultation(prev => ({ ...prev, claudeResponse: '' }))
                      }
                    }}
                    style={{
                      padding: "8px 20px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    🗑️ 内容をクリア
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}


      {/* パトロールチェックシート */}
      {activeTab === 'patrol-checklist' && (
        <div id="patrol-checklist-container">
        {/* スマホ縦画面版：段階的表示UI */}
        <div className="mobile-patrol-step-view" style={{
          display: "none", // PCと横画面では非表示（CSSで制御）
          padding: "15px",
          maxWidth: "100%"
        }}>
          {/* プログレスバー */}
          <div style={{
            backgroundColor: "#f8f9fa",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
            border: "1px solid #dee2e6"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#007bff",
              textAlign: "center"
            }}>
              ステップ {patrolMobileStep + 1} / 13
            </div>
            <div style={{
              height: "8px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                backgroundColor: "#007bff",
                width: `${((patrolMobileStep + 1) / 13) * 100}%`,
                transition: "width 0.3s ease"
              }} />
            </div>
            <div style={{
              fontSize: "12px",
              color: "#666",
              marginTop: "6px",
              textAlign: "center"
            }}>
              {patrolMobileStep === 0 ? "基本情報" :
               patrolMobileStep <= 10 ? `項目 №${patrolMobileStep}` :
               patrolMobileStep === 11 ? "パトロール結果" :
               "ISO監査欄"}
            </div>
          </div>

          {/* ステップコンテンツ */}
          <div style={{
            backgroundColor: "white",
            border: "2px solid #007bff",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "15px",
            minHeight: "400px"
          }}>
            {/* ステップ0: 基本情報 */}
            {patrolMobileStep === 0 && (
              <div>
                <h3 style={{
                  color: "#007bff",
                  marginBottom: "15px",
                  fontSize: "18px",
                  borderBottom: "2px solid #007bff",
                  paddingBottom: "8px"
                }}>
                  ✅ 基本情報入力
                </h3>

                {/* 監査日時 */}
                <div style={{ marginBottom: "15px" }}>
                  <label style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    color: "#28a745"
                  }}>
                    【監査日時】
                  </label>
                  <input
                    type="date"
                    value={patrolData.basicInfo.auditDate}
                    onChange={(e) => updatePatrolBasicInfo('auditDate', e.target.value)}
                    readOnly={patrolData.viewOnly}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      fontSize: "16px",
                      marginBottom: "10px",
                      backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={patrolData.basicInfo.startTime}
                      onChange={(e) => updatePatrolBasicInfo('startTime', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        flex: 1,
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        textAlign: "center",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                    <span>～</span>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={patrolData.basicInfo.endTime}
                      onChange={(e) => updatePatrolBasicInfo('endTime', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        flex: 1,
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        textAlign: "center",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                  </div>
                  <div style={{
                    marginTop: "8px",
                    padding: "8px",
                    backgroundColor: "#e7f1ff",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#007bff"
                  }}>
                    計 {(() => {
                      if (patrolData.basicInfo.duration !== undefined && patrolData.basicInfo.duration > 0) {
                        const hours = Math.floor(patrolData.basicInfo.duration / 60)
                        const minutes = patrolData.basicInfo.duration % 60
                        return `${hours}時間${minutes}分`
                      }
                      return "0時間0分"
                    })()} 間
                  </div>
                </div>

                {/* 被監査 */}
                <div style={{ marginBottom: "15px" }}>
                  <label style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    color: "#007bff"
                  }}>
                    【被監査】
                  </label>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      チーム名：
                    </label>
                    <select
                      value={patrolData.basicInfo.auditedTeam || selectedTeam?.name || ''}
                      onChange={(e) => updatePatrolBasicInfo('auditedTeam', e.target.value)}
                      disabled={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    >
                      <option value="">チーム選択</option>
                      {teamsList.map((team) => (
                        <option key={team.id} value={team.name}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      承認者：
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={patrolData.basicInfo.auditedApprover}
                      onChange={(e) => updatePatrolBasicInfo('auditedApprover', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      担当者：
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={patrolData.basicInfo.auditedPerson}
                      onChange={(e) => updatePatrolBasicInfo('auditedPerson', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                  </div>
                </div>

                {/* 監査 */}
                <div style={{ marginBottom: "15px" }}>
                  <label style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    color: "#dc3545"
                  }}>
                    【監査】
                  </label>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      チーム名：
                    </label>
                    <select
                      value={patrolData.basicInfo.auditorTeam || ''}
                      onChange={(e) => updatePatrolBasicInfo('auditorTeam', e.target.value)}
                      disabled={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    >
                      <option value="">監査チーム選択</option>
                      {teamsList.map((team) => (
                        <option key={team.id} value={team.name}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      承認者：
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={patrolData.basicInfo.auditorApprover}
                      onChange={(e) => updatePatrolBasicInfo('auditorApprover', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      担当者：
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={patrolData.basicInfo.auditorPerson}
                      onChange={(e) => updatePatrolBasicInfo('auditorPerson', e.target.value)}
                      readOnly={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "16px",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                  </div>
                </div>

                {/* 採点基準の説明 */}
                <div style={{
                  backgroundColor: "#fff3cd",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ffeaa7",
                  fontSize: "13px",
                  color: "#856404"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>【採点基準（5段階）】</div>
                  <div style={{ lineHeight: "1.6" }}>
                    <div>5点…カイゼンされた</div>
                    <div>4点…カイゼンが維持された状態</div>
                    <div>3点…Pカイゼン中</div>
                    <div>2点…要カイゼン</div>
                    <div>1点…進歩が見られない</div>
                  </div>
                </div>
              </div>
            )}

            {/* ステップ1-10: 各チェック項目 */}
            {patrolMobileStep >= 1 && patrolMobileStep <= 10 && (() => {
              const items = [
                { category: "整理", no: 1, content: "管理箇所全体に整理が行われているか（重複するもの、余計な物はないか）" },
                { category: "整頓", no: 2, content: "定置され、収納表記はされているか（探しにくさ・使いづらさ・紛らわしさはないか）" },
                { category: "清掃", no: 3, content: "清掃ルールを守り、月・週・日常清掃など全員で分担し実行されているか" },
                { category: "清潔", no: 4, content: "整理・整頓・清掃は計画的に実施されているか" },
                { category: "躾", no: 5, content: "職場ミーティングの実施・継続はされているか" },
                { category: "躾", no: 6, content: "職場ルールの認識、実施、見直しはされているか" },
                { category: "躾", no: 7, content: "掲示物への記入や更新はされているか" },
                { category: "カイゼン", no: 8, content: "パトロールでの指摘あればカイゼン活動に盛り込んでいるか" },
                { category: "カイゼン", no: 9, content: "カイゼン活動は展開表のスケジュール通り進んでいるか" },
                { category: "カイゼン", no: 10, content: "改善報告はLINE WORKSに投稿されているか（3か月以内）", subContent: "5：前回監査から1ヶ月以内に投稿されている　4：3か月以内に投稿されている\n3：期間内に投稿無し　2：3が続いている　1：進歩が見られない" }
              ]
              const item = items[patrolMobileStep - 1]
              const isKaizen = item.category === "カイゼン"

              return (
                <div>
                  <div style={{
                    backgroundColor: isKaizen ? "#ffeaea" : "#e8f5e9",
                    padding: "12px",
                    borderRadius: "6px",
                    marginBottom: "15px",
                    border: `2px solid ${isKaizen ? "#dc3545" : "#28a745"}`
                  }}>
                    <div style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: isKaizen ? "#dc3545" : "#28a745",
                      marginBottom: "8px"
                    }}>
                      №{item.no} {item.category}
                    </div>
                    <div style={{
                      fontSize: "15px",
                      lineHeight: "1.6",
                      color: "#333",
                      whiteSpace: "pre-wrap"
                    }}>
                      {item.content}
                    </div>
                    {item.subContent && (
                      <div style={{
                        fontSize: "13px",
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: "#fff3cd",
                        borderRadius: "4px",
                        color: "#856404",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap"
                      }}>
                        {item.subContent}
                      </div>
                    )}
                  </div>

                  {/* 評価点選択 */}
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{
                      display: "block",
                      fontWeight: "bold",
                      marginBottom: "10px",
                      fontSize: "16px"
                    }}>
                      評価点を選択：
                    </label>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "8px"
                    }}>
                      {[5, 4, 3, 2, 1].map(score => (
                        <button
                          key={score}
                          onClick={() => updatePatrolEvaluation(item.no, score)}
                          disabled={patrolData.viewOnly}
                          style={{
                            padding: "18px 8px",
                            fontSize: "20px",
                            fontWeight: "bold",
                            border: patrolData.evaluations[item.no] === score ? "3px solid #007bff" : "2px solid #dee2e6",
                            borderRadius: "8px",
                            backgroundColor: patrolData.evaluations[item.no] === score ? "#007bff" : "white",
                            color: patrolData.evaluations[item.no] === score ? "white" : "#333",
                            cursor: patrolData.viewOnly ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            opacity: patrolData.viewOnly ? 0.6 : 1
                          }}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    {patrolData.evaluations[item.no] && (
                      <div style={{
                        marginTop: "10px",
                        padding: "10px",
                        backgroundColor: "#e7f1ff",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#007bff"
                      }}>
                        選択中: {patrolData.evaluations[item.no]}点
                      </div>
                    )}
                  </div>

                  {/* コメント入力 */}
                  <div>
                    <label style={{
                      display: "block",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      fontSize: "16px"
                    }}>
                      評価コメント・改善提案：
                    </label>
                    <textarea
                      value={patrolData.comments[item.no] || ''}
                      onChange={(e) => updatePatrolComment(item.no, e.target.value)}
                      readOnly={patrolData.viewOnly}
                      placeholder="評価コメントや改善提案を入力してください"
                      maxLength={794}
                      style={{
                        width: "100%",
                        minHeight: "120px",
                        padding: "12px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "15px",
                        resize: "vertical",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                      }}
                    />
                    <div style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                      textAlign: "right"
                    }}>
                      {(patrolData.comments[item.no] || '').length} / 794文字
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ステップ11: パトロール結果 */}
            {patrolMobileStep === 11 && (
              <div>
                <h3 style={{
                  color: "#007bff",
                  marginBottom: "15px",
                  fontSize: "18px",
                  borderBottom: "2px solid #007bff",
                  paddingBottom: "8px"
                }}>
                  📊 パトロール結果
                </h3>

                {/* 合計・前回点差表示 */}
                <div style={{
                  padding: "15px",
                  backgroundColor: "#e7f1ff",
                  borderRadius: "8px",
                  border: "2px solid #007bff"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px"
                  }}>
                    <span style={{ fontSize: "16px", fontWeight: "bold" }}>合計点数：</span>
                    <span style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
                      {patrolData.totalScore}点
                    </span>
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#666",
                    display: "flex",
                    justifyContent: "space-around",
                    paddingTop: "10px",
                    borderTop: "1px solid #ccc"
                  }}>
                    <span>5: {patrolData.scoreCounts[5]}</span>
                    <span>4: {patrolData.scoreCounts[4]}</span>
                    <span>3: {patrolData.scoreCounts[3]}</span>
                    <span>2: {patrolData.scoreCounts[2]}</span>
                    <span>1: {patrolData.scoreCounts[1]}</span>
                  </div>
                  {patrolData.basicInfo.auditedTeam && (
                    <div style={{
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid #ccc",
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: "14px" }}>前回点差：</span>
                      <span style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: (() => {
                          const diff = calculateScoreDifference(
                            patrolData.totalScore,
                            patrolData.basicInfo.auditedTeam,
                            patrolData.basicInfo.auditDate,
                            patrolData.lastScore
                          )
                          return diff > 0 ? "#28a745" : diff < 0 ? "#dc3545" : "#333"
                        })()
                      }}>
                        {(() => {
                          const diff = calculateScoreDifference(
                            patrolData.totalScore,
                            patrolData.basicInfo.auditedTeam,
                            patrolData.basicInfo.auditDate,
                            patrolData.lastScore
                          )
                          return `${diff > 0 ? "+" : ""}${diff}点`
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                {/* 初回監査時の前回点数入力 */}
                {patrolData.basicInfo.auditedTeam && isFirstAudit(patrolData.basicInfo.auditedTeam) && (
                  <div style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "6px",
                    border: "1px solid #ffeaa7"
                  }}>
                    <div style={{
                      fontSize: "14px",
                      color: "#856404",
                      marginBottom: "8px",
                      fontWeight: "bold"
                    }}>
                      初回監査です。前回点数を入力してください
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label style={{ fontSize: "14px", color: "#856404" }}>前回点数：</label>
                      <input
                        type="text"
                        placeholder="例: 38"
                        value={patrolData.lastScore || ''}
                        onChange={(e) => updateLastScore(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontSize: "15px",
                          textAlign: "center"
                        }}
                      />
                      <span style={{ fontSize: "14px", color: "#856404" }}>点</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステップ12: ISO監査欄 */}
            {patrolMobileStep === 12 && (
              <div>
                <h3 style={{
                  color: "#007bff",
                  marginBottom: "15px",
                  fontSize: "18px",
                  borderBottom: "2px solid #007bff",
                  paddingBottom: "8px"
                }}>
                  📋 ISO9001 規格要求事項 監査欄
                </h3>
                <div style={{
                  fontSize: "13px",
                  color: "#666",
                  marginBottom: "15px",
                  padding: "10px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "6px"
                }}>
                  ※内部品質監査扱い（1項目以上）
                </div>

                {/* 区分の説明を最初に表示 */}
                <div style={{
                  padding: "12px",
                  backgroundColor: "#fff3cd",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#856404",
                  lineHeight: "1.6",
                  marginBottom: "15px"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "6px" }}>評価区分について：</div>
                  <div>・<strong>長所：</strong>優れている点</div>
                  <div>・<strong>気づき：</strong>このまま続くことで不適合になりうる恐れ</div>
                  <div>・<strong>観察：</strong>不適合及び不適合となりうる内容</div>
                </div>

                {[1, 2].map(index => (
                  <div key={index} style={{
                    marginBottom: "20px",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #dee2e6"
                  }}>
                    <div style={{
                      fontWeight: "bold",
                      marginBottom: "10px",
                      color: "#007bff",
                      fontSize: "16px"
                    }}>
                      監査項目 {index}
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", fontWeight: "bold" }}>
                        規格番号/項目名：
                      </label>
                      <input
                        type="text"
                        value={patrolData.isoItems?.[index]?.code || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'code', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        placeholder="例: 8.2.1 顧客コミュニケーション"
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "15px",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", fontWeight: "bold" }}>
                        監査内容：
                      </label>
                      <textarea
                        value={patrolData.isoItems?.[index]?.content || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'content', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        placeholder="監査内容を入力してください"
                        maxLength={105}
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "15px",
                          resize: "vertical",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", fontWeight: "bold" }}>
                        評価区分：
                      </label>
                      <select
                        value={patrolData.isoItems?.[index]?.rating || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'rating', e.target.value)}
                        disabled={patrolData.viewOnly}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "15px",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      >
                        <option value="">選択してください</option>
                        <option value="長所">長所</option>
                        <option value="気づき">気づき</option>
                        <option value="観察">観察</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "14px", marginBottom: "6px", fontWeight: "bold" }}>
                        監査内容（証拠確認）：
                      </label>
                      <textarea
                        value={patrolData.isoItems?.[index]?.evidence || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'evidence', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        placeholder="証拠確認内容を入力してください"
                        maxLength={105}
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "15px",
                          resize: "vertical",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ナビゲーションボタン */}
          <div style={{
            display: "flex",
            gap: "10px",
            justifyContent: "space-between"
          }}>
            <button
              onClick={() => setPatrolMobileStep(Math.max(0, patrolMobileStep - 1))}
              disabled={patrolMobileStep === 0}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: patrolMobileStep === 0 ? "#e9ecef" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: patrolMobileStep === 0 ? "not-allowed" : "pointer",
                opacity: patrolMobileStep === 0 ? 0.5 : 1
              }}
            >
              ← 前へ
            </button>
            {patrolMobileStep < 12 ? (
              <button
                onClick={() => setPatrolMobileStep(Math.min(12, patrolMobileStep + 1))}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                次へ →
              </button>
            ) : (
              <button
                onClick={savePatrolChecklist}
                disabled={patrolData.viewOnly}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: patrolData.viewOnly ? "not-allowed" : "pointer",
                  opacity: patrolData.viewOnly ? 0.5 : 1
                }}
              >
                💾 保存
              </button>
            )}
          </div>

          {/* 戻るボタン（編集/閲覧モード時） */}
          {(patrolData.editingId || patrolData.viewOnly) && (
            <button
              onClick={() => {
                setPatrolData({
                  evaluations: {},
                  comments: {},
                  totalScore: 0,
                  scoreCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                  basicInfo: {
                    auditedTeam: '',
                    auditedApprover: '',
                    auditedPerson: '',
                    auditorTeam: '',
                    auditorApprover: '',
                    auditorPerson: '',
                    auditDate: '',
                    startTime: '',
                    endTime: '',
                    duration: 0
                  },
                  lastScore: null,
                  scoreDifference: 0,
                  isoItems: {},
                  editingId: undefined,
                  viewOnly: undefined
                })
                setPatrolMobileStep(0)
                setActiveTab('patrol-history')
              }}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "14px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ← 一覧に戻る
            </button>
          )}
        </div>

        {/* 以下はPC版・横画面版 */}
        {/* ボタン群 - 印刷範囲外 */}
        <div className="no-print" style={{ display: "flex", gap: "15px", justifyContent: "flex-end", maxWidth: "100%", margin: "0 auto 10px auto", padding: "0 10px" }}>
          {/* 編集中または閲覧中の場合のみ戻るボタンを表示 */}
          {(patrolData.editingId || patrolData.viewOnly) && (
            <button
              onClick={() => {
                // フォームをクリアして編集/閲覧モードを解除
                setPatrolData({
                  evaluations: {},
                  comments: {},
                  totalScore: 0,
                  scoreCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                  basicInfo: {
                    auditedTeam: '',
                    auditedApprover: '',
                    auditedPerson: '',
                    auditorTeam: '',
                    auditorApprover: '',
                    auditorPerson: '',
                    auditDate: '',
                    startTime: '',
                    endTime: '',
                    duration: 0
                  },
                  lastScore: null,
                  scoreDifference: 0,
                  isoItems: {},
                  editingId: undefined,
                  viewOnly: undefined
                })
                // 一覧タブに戻る
                setActiveTab('patrol-history')
              }}
              style={{
                padding: "12px 30px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ← 戻る
            </button>
          )}

          {/* 閲覧モードでは保存ボタンを非表示 */}
          {!patrolData.viewOnly && (
            <button
              onClick={savePatrolChecklist}
              style={{
                padding: "12px 30px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              💾 チェックシートを保存
            </button>
          )}

          <button
            onClick={async () => {
              showToast('PDF生成中...', 'info')
              const fileName = `パトロールチェックシート_${patrolData?.basicInfo?.auditedTeam || '未設定'}_${patrolData?.basicInfo?.auditDate || new Date().toISOString().split('T')[0]}.pdf`

              await generatePDF('patrol-checklist-form', {
                fileName: fileName,
                width: 1800,
                orientation: 'landscape',
                scale: 2,
                fillPage: true,
                margin: 0,
                onSuccess: () => {
                  showToast('✅ PDF出力が完了しました', 'success')
                },
                onError: (error) => {
                  showToast('PDF出力中にエラーが発生しました: ' + error.message, 'error')
                }
              })
            }}
            style={{
              padding: "12px 30px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            📄 PDFで出力
          </button>

          <button
            onClick={async () => {
              showToast('PDF生成中...', 'info')

              await generatePDF('patrol-checklist-form', {
                fileName: 'patrol-checklist.pdf',
                width: 1800,
                orientation: 'landscape',
                scale: 2,
                fillPage: true,
                margin: 0,
                openInNewTab: true,
                onSuccess: () => {
                  showToast('✅ PDF生成完了。印刷ダイアログが開きます', 'success')
                },
                onError: (error) => {
                  showToast('PDF生成中にエラーが発生しました: ' + error.message, 'error')
                }
              })
            }}
            style={{
              padding: "12px 30px",
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            🖨️ このフォームを印刷
          </button>
        </div>

        <div id="patrol-checklist-form" style={{
          padding: "10px",
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto 20px auto",
          backgroundColor: "white",
          fontSize: "15px",
          boxSizing: "border-box",
          border: "3px solid #007bff"
        }}>
          {/* 基本情報 */}
          <div className="patrol-basic-info" style={{
            backgroundColor: "#f8f9fa",
            padding: "8px",
            borderRadius: "6px",
            marginBottom: "3px",
            border: "1px solid #dee2e6",
            fontSize: "15px"
          }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#007bff", fontSize: "30px", textAlign: "left" }}>✅ MKG パトロールチェックシート</h3>

            {/* 1行に全情報を配置 */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* 被監査 */}
              <span style={{ fontWeight: "bold", color: "#007bff", fontSize: "15px" }}>【被監査】</span>
              <select
                value={patrolData.basicInfo.auditedTeam || selectedTeam?.name || ''}
                onChange={(e) => updatePatrolBasicInfo('auditedTeam', e.target.value)}
                disabled={patrolData.viewOnly}
                style={{
                  padding: "0 6px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  width: "150px",
                  height: "32px",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              >
                <option value="">チーム選択</option>
                {teamsList.map((team) => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </select>

              <label style={{ fontSize: "14px", color: "#495057", fontWeight: "bold", whiteSpace: "nowrap" }}>承認者：</label>
              <input
                type="text"
                maxLength={15}
                value={patrolData.basicInfo.auditedApprover}
                onChange={(e) => updatePatrolBasicInfo('auditedApprover', e.target.value)}
                readOnly={patrolData.viewOnly}
                style={{
                  width: "150px",
                  padding: "0 8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  height: "32px",
                  boxSizing: "border-box",
                  textAlign: "left",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              />

              <label style={{ fontSize: "14px", color: "#495057", fontWeight: "bold", whiteSpace: "nowrap" }}>担当者：</label>
              <input
                type="text"
                maxLength={15}
                value={patrolData.basicInfo.auditedPerson}
                onChange={(e) => updatePatrolBasicInfo('auditedPerson', e.target.value)}
                readOnly={patrolData.viewOnly}
                style={{
                  width: "150px",
                  padding: "0 8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  height: "32px",
                  boxSizing: "border-box",
                  textAlign: "left",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              />

              {/* 監査 */}
              <span style={{ fontWeight: "bold", color: "#dc3545", fontSize: "15px" }}>【監査】</span>
              <select
                value={patrolData.basicInfo.auditorTeam || ''}
                onChange={(e) => updatePatrolBasicInfo('auditorTeam', e.target.value)}
                disabled={patrolData.viewOnly}
                style={{
                  padding: "0 6px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  width: "150px",
                  height: "32px",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              >
                <option value="">監査チーム選択</option>
                {teamsList.map((team) => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </select>

              <label style={{ fontSize: "14px", color: "#495057", fontWeight: "bold", whiteSpace: "nowrap" }}>承認者：</label>
              <input
                type="text"
                maxLength={15}
                value={patrolData.basicInfo.auditorApprover}
                onChange={(e) => updatePatrolBasicInfo('auditorApprover', e.target.value)}
                readOnly={patrolData.viewOnly}
                style={{
                  width: "150px",
                  padding: "0 8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  height: "32px",
                  boxSizing: "border-box",
                  textAlign: "left",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              />

              <label style={{ fontSize: "14px", color: "#495057", fontWeight: "bold", whiteSpace: "nowrap" }}>担当者：</label>
              <input
                type="text"
                maxLength={15}
                value={patrolData.basicInfo.auditorPerson}
                onChange={(e) => updatePatrolBasicInfo('auditorPerson', e.target.value)}
                readOnly={patrolData.viewOnly}
                style={{
                  width: "150px",
                  padding: "0 8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "15px",
                  height: "32px",
                  boxSizing: "border-box",
                  textAlign: "left",
                  backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                }}
              />

              {/* 監査日時 */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontWeight: "bold", color: "#28a745", fontSize: "15px" }}>【監査日時】</span>
                <input
                  type="date"
                  value={patrolData.basicInfo.auditDate}
                  onChange={(e) => updatePatrolBasicInfo('auditDate', e.target.value)}
                  readOnly={patrolData.viewOnly}
                  style={{
                    padding: "4px 6px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "15px",
                    width: "130px",
                    backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                  }}
                />
                <span style={{ fontSize: "15px" }}>時間</span>
                <input
                  type="text"
                  placeholder="00:00"
                  value={patrolData.basicInfo.startTime}
                  onChange={(e) => updatePatrolBasicInfo('startTime', e.target.value)}
                  readOnly={patrolData.viewOnly}
                  style={{
                    padding: "4px 6px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "15px",
                    width: "90px",
                    backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white",
                    textAlign: "center"
                  }}
                />
                <span style={{ fontSize: "15px" }}>～</span>
                <input
                  type="text"
                  placeholder="00:00"
                  value={patrolData.basicInfo.endTime}
                  onChange={(e) => updatePatrolBasicInfo('endTime', e.target.value)}
                  readOnly={patrolData.viewOnly}
                  style={{
                    padding: "4px 6px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "15px",
                    width: "90px",
                    backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white",
                    textAlign: "center"
                  }}
                />
                <span style={{ fontSize: "15px" }}>計</span>
                <div style={{
                  padding: "6px 8px",
                  border: "2px solid #007bff",
                  borderRadius: "4px",
                  fontSize: "15px",
                  width: "80px",
                  backgroundColor: "#e7f1ff",
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "#007bff"
                }}>
                  {(() => {
                    if (patrolData.basicInfo.duration !== undefined && patrolData.basicInfo.duration > 0) {
                      const hours = Math.floor(patrolData.basicInfo.duration / 60)
                      const minutes = patrolData.basicInfo.duration % 60
                      return `${hours}:${minutes.toString().padStart(2, '0')}`
                    }
                    return "0:00"
                  })()}
                </div>
                <span style={{ fontSize: "15px" }}>分間</span>
              </div>
            </div>

            {/* 採点基準 */}
            <div style={{
              backgroundColor: "#fff3cd",
              padding: "4px 8px",
              borderRadius: "6px",
              marginTop: "2px",
              marginBottom: "2px",
              border: "1px solid #ffeaa7"
            }}>
              <div style={{ fontSize: "15px", color: "#856404", lineHeight: "1.4" }}>
                <div style={{ marginBottom: "2px" }}>
                  <strong style={{ fontSize: "16px" }}>【採点基準（5段階）】</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", paddingLeft: "3em", paddingRight: "3em" }}>
                  <div style={{ whiteSpace: "nowrap", fontSize: "15px" }}><strong>5点</strong>…カイゼンされた</div>
                  <div style={{ whiteSpace: "nowrap", fontSize: "15px" }}><strong>4点</strong>…カイゼンが維持された状態（指摘もカイゼンも無）</div>
                  <div style={{ whiteSpace: "nowrap", fontSize: "15px" }}><strong>3点</strong>…Pカイゼン中</div>
                  <div style={{ whiteSpace: "nowrap", fontSize: "15px" }}><strong>2点</strong>…要カイゼン</div>
                  <div style={{ whiteSpace: "nowrap", fontSize: "15px" }}><strong>1点</strong>…進歩が見られない<span style={{ fontSize: "13px", marginLeft: "4px" }}>※1点は同様の指摘が3回続いた時を基準に用いる</span></div>
                </div>
              </div>
            </div>
          </div>
          {/* チェック項目 - 青枠（外側） */}
          <div style={{
            border: "1px solid transparent",
            borderRadius: "6px",
            overflow: "visible",
            marginTop: "2px",
            position: "relative",
            height: "1009px"
          }}>
            {/* チェック項目内側 */}
            <div style={{
              backgroundColor: "transparent",
              fontSize: "15px",
              position: "relative",
              height: "743px",
              border: "none"
            }}>
              <div style={{ padding: "8px", backgroundColor: "transparent" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "60px 60px 4.5fr 45px 45px 45px 45px 45px 5.5fr",
                gap: "6px",
                marginBottom: "3px",
                fontWeight: "bold",
                fontSize: "15px",
                textAlign: "center",
                backgroundColor: "#e7f1ff",
                padding: "8px",
                borderRadius: "4px"
              }}>
                <div style={{ whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>項目</div>
                <div style={{ whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>No.</div>
                <div style={{ whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>詳細・内容</div>
                <div colSpan="5" style={{ gridColumn: "span 5", whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word" }}>評価点</div>
                <div style={{ whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "break-word", lineHeight: "1.3" }}>【項目別評価コメント・カイゼン提案記入欄】</div>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "60px 60px 4.5fr 45px 45px 45px 45px 45px 5.5fr",
                gap: "6px",
                marginBottom: "4px",
                fontWeight: "bold",
                fontSize: "15px",
                textAlign: "center",
                backgroundColor: "#e7f1ff",
                padding: "6px",
                borderRadius: "4px"
              }}>
                <div></div>
                <div></div>
                <div></div>
                <div>5</div>
                <div>4</div>
                <div>3</div>
                <div>2</div>
                <div>1</div>
                <div></div>
              </div>

              {/* 左側: №1～10のチェック項目 */}
              <div className="patrol-items-grid" style={{ display: "grid", gridTemplateColumns: "60px 60px 4.5fr 45px 45px 45px 45px 45px 5.5fr", gap: "5px", backgroundColor: "white" }}>
                {/* 左側の項目列（№1～10） */}
                <div style={{ gridColumn: "1 / 9", display: "contents" }}>
                  {[
                    { category: "整理", no: 1, content: "管理箇所全体に整理が行われているか\n（重複するもの、余計な物はないか）" },
                    { category: "整頓", no: 2, content: "定置され、収納表記はされているか\n（探しにくさ・使いづらさ・紛らわしさはないか）" },
                    { category: "清掃", no: 3, content: "清掃ルールを守り、月・週・日常清掃など\n全員で分担し実行されているか" },
                    { category: "清潔", no: 4, content: "整理・整頓・清掃は計画的に実施されているか" },
                    { category: "躾", no: 5, content: "職場ミーティングの実施・継続はされているか" },
                    { category: "躾", no: 6, content: "職場ルールの認識、実施、見直しはされているか" },
                    { category: "躾", no: 7, content: "掲示物への記入や更新はされているか" },
                    { category: "カイゼン", no: 8, content: "パトロールでの指摘あればカイゼン活動に盛り込んでいるか" },
                    { category: "カイゼン", no: 9, content: "カイゼン活動は展開表のスケジュール通り進んでいるか" },
                    { category: "カイゼン", no: 10, content: "改善報告はLINE WORKSに投稿されているか（3か月以内）", subContent: "5：前回監査から1ヶ月以内に投稿されている　4：3か月以内に投稿されている\n3：期間内に投稿無し　2：3が続いている　1：進歩が見られない" }
                  ].map((item, index) => (
                    <React.Fragment key={index}>
                      <div className="patrol-item-category" style={{
                        fontSize: "15px",
                        fontWeight: "bold",
                        textAlign: "center",
                        padding: "5px",
                        backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                        color: item.category === "整理" || item.category === "整頓" || item.category === "清掃" || item.category === "清潔" || item.category === "躾" ? "#28a745" :
                              item.category === "カイゼン" ? "#dc3545" : "#333",
                        minHeight: "48px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {item.category}
                      </div>
                      <div className="patrol-item-number" style={{
                        fontSize: "15px",
                        textAlign: "center",
                        fontWeight: "bold",
                        padding: "5px",
                        backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                        minHeight: "48px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {item.no}
                      </div>
                      <div className="patrol-item-content" style={{
                        fontSize: "15px",
                        lineHeight: "1.4",
                        whiteSpace: "pre-line",
                        padding: "5px",
                        backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                        minHeight: "48px",
                        display: "flex",
                        alignItems: "flex-start",
                        flexDirection: "column",
                        gap: "3px",
                        textAlign: "left"
                      }}>
                        <div>{item.content}</div>
                        {item.subContent && (
                          <div style={{ fontSize: "13px", lineHeight: "1.3" }}>
                            {item.subContent}
                          </div>
                        )}
                      </div>

                      {/* 評価ボタン（5点〜1点） */}
                      {[5, 4, 3, 2, 1].map(point => (
                        <div key={point} className="patrol-item-rating" style={{
                          textAlign: "center",
                          position: "relative",
                          padding: "5px",
                          backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                          minHeight: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <div
                            onClick={() => {
                              if (patrolData.viewOnly) return;  // 読み取り専用の場合はクリック無効
                              if (patrolData.evaluations[item.no] === point) {
                                updatePatrolEvaluation(item.no, null)
                              } else {
                                updatePatrolEvaluation(item.no, point)
                              }
                            }}
                            style={{
                              width: "35px",
                              height: "35px",
                              border: "2px solid #007bff",
                              cursor: patrolData.viewOnly ? "default" : "pointer",
                              backgroundColor: patrolData.evaluations[item.no] === point ? "#007bff" : (patrolData.viewOnly ? "#e9ecef" : "white"),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "15px",
                              fontWeight: "bold",
                              opacity: patrolData.viewOnly ? 0.7 : 1
                            }}
                          >
                            {patrolData.evaluations[item.no] === point && "✓"}
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                {/* 右側全体を2段に分割 */}
                <div style={{
                  gridColumn: "9 / 10",
                  gridRow: "1 / 12",
                  position: "relative",
                  minHeight: "800px",
                  backgroundColor: "white"
                }}>
                  {/* 上: 評価コメント・カイゼン提案記入欄 */}
                  <div style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    height: "330px",
                    backgroundColor: "white",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "stretch",
                    overflow: "hidden"
                  }}>
                    <textarea
                      placeholder="№1～10の評価コメント・カイゼン提案を記入（794文字まで）"
                      maxLength={794}
                      value={patrolData.comments['1-4'] || ''}
                      onChange={(e) => {
                        const text = e.target.value
                        if (text.length <= 794) {
                          updatePatrolComment('1-4', text)
                        }
                      }}
                      readOnly={patrolData.viewOnly}
                      style={{
                        width: "100%",
                        height: "100%",
                        padding: "6px",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "15px",
                        resize: "none",
                        backgroundColor: patrolData.viewOnly ? "#e9ecef" : "#f8f9fa",
                        wordBreak: "break-all",
                        overflowWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* 下: ISO監査欄 */}
                  <div
                    ref={isoSectionRef}
                    style={{
                      position: "absolute",
                      top: "337px",
                      left: "0",
                      right: "0",
                      height: "463px",
                      backgroundColor: "#f0f0ff",
                      border: "2px solid #6f42c1",
                      borderRadius: "4px",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "auto"
                    }}
                  >
                  <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "5px"
                  }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#6f42c1" }}>
                      ISO9001 規格要求事項 監査欄（内部品質監査扱い）※1項目以上
                    </div>
                    <button
                      onClick={copyISOItemsToClipboard}
                      style={{
                        padding: "4px 12px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#5a32a3"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#6f42c1"}
                    >
                      📋 コピー
                    </button>
                  </div>

                  {/* ヘッダー */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 80px 1fr",
                    gap: "3px",
                    fontSize: "15px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    textAlign: "center"
                  }}>
                    <div>規格番号</div>
                    <div>監査内容</div>
                    <div>評価区分</div>
                    <div>監査内容（証拠確認）</div>
                  </div>

                  {/* 2項目分 */}
                  {[1, 2].map(index => (
                    <div key={index} style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 80px 1fr",
                      gap: "3px",
                      marginBottom: "4px",
                      alignItems: "start"
                    }}>
                      <input
                        type="text"
                        placeholder="規格番号"
                        value={patrolData.isoItems?.[index]?.code || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'code', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        style={{
                          padding: "4px 6px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "15px",
                          height: "157px",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                      <textarea
                        rows="4"
                        placeholder="監査内容"
                        maxLength="105"
                        value={patrolData.isoItems?.[index]?.content || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'content', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        style={{
                          padding: "4px 6px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "15px",
                          resize: "none",
                          height: "157px",
                          minHeight: "157px",
                          maxHeight: "157px",
                          overflow: "hidden",
                          wordBreak: "break-all",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                      <select
                        value={patrolData.isoItems?.[index]?.rating || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'rating', e.target.value)}
                        disabled={patrolData.viewOnly}
                        style={{
                          padding: "4px 6px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "15px",
                          height: "157px",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      >
                        <option value="">選択</option>
                        <option value="長所">長所</option>
                        <option value="気づき">気づき</option>
                        <option value="観察">観察</option>
                      </select>
                      <textarea
                        rows="4"
                        placeholder="証拠確認内容"
                        maxLength="105"
                        value={patrolData.isoItems?.[index]?.evidence || ''}
                        onChange={(e) => updatePatrolISOItem(index, 'evidence', e.target.value)}
                        readOnly={patrolData.viewOnly}
                        style={{
                          padding: "4px 6px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "15px",
                          resize: "none",
                          height: "157px",
                          minHeight: "157px",
                          maxHeight: "157px",
                          overflow: "hidden",
                          wordBreak: "break-all",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                          backgroundColor: patrolData.viewOnly ? "#e9ecef" : "white"
                        }}
                      />
                    </div>
                  ))}

                  {/* 説明 */}
                  <div style={{
                    marginTop: "2px",
                    fontSize: "15px",
                    color: "#666",
                    backgroundColor: "white",
                    padding: "3px",
                    borderRadius: "3px",
                    border: "1px solid #ddd",
                    lineHeight: "1.2"
                  }}>
                    <div><strong>区分：</strong>長所・気づき・観察</div>
                    <div><strong>気づき：</strong>不適合の恐れ</div>
                    <div><strong>観察：</strong>不適合内容</div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* 合計・結果とISO監査欄を横並び配置 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "60px 60px 4.5fr 45px 45px 45px 45px 45px 5.5fr",
            gap: "6px",
            marginTop: "-262px",
            position: "relative",
            zIndex: 1,
            alignItems: "end"
          }}>
            {/* 合計（列1-3） */}
            <div style={{
              gridColumn: "1 / 4",
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #dee2e6"
            }}>
              <label style={{ display: "block", marginBottom: "2px", fontWeight: "bold", fontSize: "12px" }}>合計</label>
              <div style={{
                padding: "4px 8px",
                backgroundColor: "white",
                border: "2px solid #007bff",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#007bff"
              }}>
                <span>{patrolData.totalScore}</span> 点
              </div>
            </div>

            {/* 内訳（列4-8、チェックボックス5～1の真下） */}
            <div style={{
              gridColumn: "4 / 9",
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #dee2e6"
            }}>
              <label style={{ display: "block", marginBottom: "2px", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>内訳</label>
              <div style={{
                padding: "4px 6px",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "13px"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "3px", textAlign: "center" }}>
                  <div><strong>5:</strong> {patrolData.scoreCounts[5]}</div>
                  <div><strong>4:</strong> {patrolData.scoreCounts[4]}</div>
                  <div><strong>3:</strong> {patrolData.scoreCounts[3]}</div>
                  <div><strong>2:</strong> {patrolData.scoreCounts[2]}</div>
                  <div><strong>1:</strong> {patrolData.scoreCounts[1]}</div>
                </div>
              </div>
            </div>

            {/* 前回点差（新しい行、列1-8） */}
            <div style={{
              gridColumn: "1 / 9",
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #dee2e6",
              display: "grid",
              gridTemplateColumns: "60px 60px 4.5fr 45px 45px 45px 45px 45px",
              gap: "6px",
              alignItems: "center"
            }}>
              <div style={{ gridColumn: "1 / 4" }}>
                <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "12px" }}>前回点差</label>
                <div style={{
                  padding: "6px",
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  textAlign: "center",
                  fontSize: "14px"
                }}>
                  {(() => {
                    const diff = calculateScoreDifference(
                      patrolData.totalScore,
                      patrolData.basicInfo.auditedTeam,
                      patrolData.basicInfo.auditDate,
                      patrolData.lastScore
                    )
                    return (
                      <span style={{
                        color: diff > 0 ? "#28a745" : diff < 0 ? "#dc3545" : "#333",
                        fontWeight: "bold"
                      }}>
                        {diff > 0 ? "+" : ""}{diff} 点
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* 初回監査時の前回点数入力欄（内訳表の横幅に合わせる） */}
              {(isFirstTimeCreation() || (patrolData.basicInfo.auditedTeam && isFirstAudit(patrolData.basicInfo.auditedTeam))) && (
                <div style={{ gridColumn: "4 / 9" }}>
                  <div style={{
                    padding: "6px",
                    backgroundColor: "#fff3cd",
                    border: "1px solid #ffeaa7",
                    borderRadius: "4px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#856404", marginBottom: "4px", textAlign: "center" }}>
                      初回監査です。前回点数を入力してください
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                      <span style={{ fontSize: "11px", color: "#856404" }}>前回点数:</span>
                      <input
                        type="text"
                        placeholder="例: 38"
                        value={patrolData.lastScore || ''}
                        onChange={(e) => updateLastScore(e.target.value)}
                        style={{
                          width: "80px",
                          padding: "0 4px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "11px",
                          height: "24px",
                          boxSizing: "border-box",
                          textAlign: "center"
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "#856404" }}>点</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        </div>
      )}

      {/* パトロールチェックシート一覧 */}
      {activeTab === 'patrol-history' && (
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#007bff", marginBottom: "30px" }}>📋 パトロールチェックシート一覧表</h2>

          {savedPatrolChecklists.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6"
            }}>
              <p style={{ color: "#666", fontSize: "16px" }}>
                保存されたパトロールチェックリストがありません。<br/>
                パトロールチェックシートタブで作成・保存してください。
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gap: "20px"
            }}>
              {savedPatrolChecklists.map((checklist, index) => (
                <div key={checklist.id} style={{
                  backgroundColor: "white",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  position: "relative" // 削除ボタンのため
                }}>
                  {/* ✖️ 右上の削除ボタン */}
                  <button
                    onClick={async () => {
                      const confirmMessage = `パトロールチェックシートを削除しますか？\n\n監査日: ${checklist.basicInfo.auditDate}\n被監査チーム: ${checklist.basicInfo.auditedTeam}\n監査チーム: ${checklist.basicInfo.auditorTeam}\n\nこの操作は取り消せません。`
                      if (window.confirm(confirmMessage)) {
                        // Supabaseから削除
                        const { error } = await supabase
                          .from('patrol_checklists')
                          .delete()
                          .eq('id', checklist.id)
                          .eq('team_id', selectedTeam.id)

                        if (error) {
                          console.error('❌ チェックシート削除エラー:', error)
                          showToast('チェックシートの削除に失敗しました', 'error')
                        } else {
                          console.log('🗑️ チェックシート削除完了:', checklist.id)
                          // Supabaseから最新データを再読み込みしてステートを更新
                          const updatedChecklists = await loadPatrolChecklistsFromSupabase()
                          setSavedPatrolChecklists(updatedChecklists)
                        }
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "24px",
                      height: "24px",
                      backgroundColor: "transparent",
                      color: "#dc3545",
                      border: "2px solid #dc3545",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.7,
                      transition: "all 0.2s ease",
                      zIndex: 1
                    }}
                    onMouseOver={(e) => {
                      e.target.style.opacity = "1"
                      e.target.style.transform = "scale(1.1)"
                      e.target.style.backgroundColor = "#dc3545"
                      e.target.style.color = "white"
                    }}
                    onMouseOut={(e) => {
                      e.target.style.opacity = "0.7"
                      e.target.style.transform = "scale(1)"
                      e.target.style.backgroundColor = "transparent"
                      e.target.style.color = "#dc3545"
                    }}
                    title="チェックシートを削除"
                  >
                    ✕
                  </button>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: "0 0 15px 0",
                        color: "#333",
                        fontSize: "15px"
                      }}>
                        📋 {checklist.basicInfo.auditedTeam} パトロール結果
                      </h3>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "15px",
                        marginBottom: "15px"
                      }}>
                        <div>
                          <strong>監査日:</strong> {checklist.basicInfo.auditDate}
                        </div>
                        <div>
                          <strong>被監査チーム:</strong> {checklist.basicInfo.auditedTeam}
                        </div>
                        <div>
                          <strong>監査チーム:</strong> {checklist.basicInfo.auditorTeam}
                        </div>
                        <div>
                          <strong>所要時間:</strong> {checklist.basicInfo.duration || 0}分
                        </div>
                        <div>
                          <strong>保存日時:</strong> {new Date(checklist.savedAt).toLocaleString('ja-JP')}
                        </div>
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: "10px",
                        fontSize: "15px",
                        backgroundColor: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "4px"
                      }}>
                        <div><strong>合計点数:</strong></div>
                        <div><strong>前回点差:</strong></div>
                        <div><strong>5点:</strong></div>
                        <div><strong>4点:</strong></div>
                        <div><strong>3点:</strong></div>
                        <div><strong>2点:</strong></div>
                        <div><strong>1点:</strong></div>

                        <div style={{
                          fontSize: "15px",
                          fontWeight: "bold",
                          color: "#007bff"
                        }}>
                          {checklist.totalScore}点
                        </div>
                        <div style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: checklist.scoreDifference > 0 ? "#28a745" :
                                checklist.scoreDifference < 0 ? "#dc3545" : "#333"
                        }}>
                          {checklist.scoreDifference > 0 ? "+" : ""}{checklist.scoreDifference}点
                        </div>
                        <div>{checklist.scoreCounts[5]}</div>
                        <div>{checklist.scoreCounts[4]}</div>
                        <div>{checklist.scoreCounts[3]}</div>
                        <div>{checklist.scoreCounts[2]}</div>
                        <div>{checklist.scoreCounts[1]}</div>
                      </div>

                      {/* コメント抜粋 */}
                      {Object.keys(checklist.comments).length > 0 && (
                        <div style={{ marginTop: "15px" }}>
                          <strong style={{ fontSize: "14px", color: "#666" }}>主なコメント:</strong>
                          <div style={{
                            fontSize: "15px",
                            color: "#666",
                            marginTop: "5px",
                            maxHeight: "60px",
                            overflow: "hidden"
                          }}>
                            {Object.values(checklist.comments)
                              .filter(comment => comment.trim())
                              .slice(0, 2)
                              .map((comment, i) => (
                                <div key={i}>• {comment}</div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                      alignSelf: "flex-end",
                      minHeight: "100%"
                    }}>
                      <div style={{
                        backgroundColor: index < 3 ? "#e7f3ff" : "#f8f9fa",
                        padding: "5px 10px",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: index < 3 ? "#0056b3" : "#666"
                      }}>
                        {index === 0 ? "🏆 最新" :
                         index === 1 ? "🥈 前回" :
                         index === 2 ? "🥉 前々回" : `${index + 1}回前`}
                      </div>

                      <button
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "15px",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          // 編集: フォームにデータを読み込んでタブを切り替え
                          setPatrolData({
                            ...checklist,
                            editingId: checklist.id  // 編集中のIDを保存
                          })
                          setActiveTab('patrol-checklist')
                        }}
                      >
                        ✏️ 編集
                      </button>

                      <button
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#17a2b8",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "15px",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          // 閲覧: フォームにデータを読み込んで読み取り専用モードでタブを切り替え
                          setPatrolData({
                            ...checklist,
                            viewOnly: true  // 読み取り専用フラグ
                          })
                          setActiveTab('patrol-checklist')
                        }}
                      >
                        閲覧
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 全社監査ビュー */}
      {activeTab === 'audit-view' && (
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#007bff", marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
            🔍 全社改善活動監査ビュー
            <button
              onClick={loadAllTeamsData}
              style={{
                padding: "6px 12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: "pointer",
                marginLeft: "auto"
              }}
            >
              🔄 データ更新
            </button>
          </h2>

          {auditView.isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", fontSize: "18px", color: "#666" }}>
              読み込み中...
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "20px",
              marginTop: "20px"
            }}>
              {teamsList.map((team) => {
                const stats = auditView.teamStats[team.id] || { tasksCount: 0, reportsCount: 0, patrolsCount: 0, avgScore: 0 }
                return (
                  <div
                    key={team.id}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #007bff",
                      borderRadius: "8px",
                      padding: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      transition: "all 0.2s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                    onClick={() => openTeamDetailModal(team.id)}
                  >
                    <h3 style={{ color: "#007bff", marginBottom: "15px", fontSize: "20px" }}>
                      {team.name}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>📋 カイゼン計画:</span>
                        <strong>{stats.tasksCount}件</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>📊 完了報告:</span>
                        <strong>{stats.reportsCount}件</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>✅ パトロール:</span>
                        <strong>{stats.patrolsCount}件</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #ddd" }}>
                        <span>📈 平均スコア:</span>
                        <strong style={{ color: stats.avgScore >= 80 ? "#28a745" : stats.avgScore >= 60 ? "#ffc107" : "#dc3545" }}>
                          {stats.avgScore}点
                        </strong>
                      </div>
                    </div>
                    <div style={{ marginTop: "15px", textAlign: "center", color: "#007bff", fontSize: "14px", fontWeight: "500" }}>
                      クリックして詳細を見る →
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* チーム詳細モーダル */}
      {auditView.showDetailModal && auditView.selectedTeamId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "30px",
            maxWidth: "1000px",
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#007bff", margin: 0 }}>
                {teamsList.find(t => t.id === auditView.selectedTeamId)?.name} - 詳細
              </h2>
              <button
                onClick={closeTeamDetailModal}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                ✕ 閉じる
              </button>
            </div>

            {/* サブタブ */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #ddd" }}>
              <button
                onClick={() => setAuditView(prev => ({ ...prev, selectedDataType: 'tasks' }))}
                style={{
                  padding: "10px 20px",
                  backgroundColor: auditView.selectedDataType === 'tasks' ? "#007bff" : "#f8f9fa",
                  color: auditView.selectedDataType === 'tasks' ? "white" : "#333",
                  border: "1px solid #ddd",
                  borderBottom: auditView.selectedDataType === 'tasks' ? "none" : "1px solid #ddd",
                  borderRadius: "4px 4px 0 0",
                  cursor: "pointer"
                }}
              >
                📋 カイゼン計画
              </button>
              <button
                onClick={() => setAuditView(prev => ({ ...prev, selectedDataType: 'reports' }))}
                style={{
                  padding: "10px 20px",
                  backgroundColor: auditView.selectedDataType === 'reports' ? "#007bff" : "#f8f9fa",
                  color: auditView.selectedDataType === 'reports' ? "white" : "#333",
                  border: "1px solid #ddd",
                  borderBottom: auditView.selectedDataType === 'reports' ? "none" : "1px solid #ddd",
                  borderRadius: "4px 4px 0 0",
                  cursor: "pointer"
                }}
              >
                📊 完了報告
              </button>
              <button
                onClick={() => setAuditView(prev => ({ ...prev, selectedDataType: 'patrols' }))}
                style={{
                  padding: "10px 20px",
                  backgroundColor: auditView.selectedDataType === 'patrols' ? "#007bff" : "#f8f9fa",
                  color: auditView.selectedDataType === 'patrols' ? "white" : "#333",
                  border: "1px solid #ddd",
                  borderBottom: auditView.selectedDataType === 'patrols' ? "none" : "1px solid #ddd",
                  borderRadius: "4px 4px 0 0",
                  cursor: "pointer"
                }}
              >
                ✅ パトロール履歴
              </button>
            </div>

            {/* データ表示エリア */}
            <div style={{ marginTop: "20px" }}>
              {auditView.selectedDataType === 'tasks' && (
                <div>
                  <h3>カイゼン計画一覧</h3>
                  {auditView.teamData[auditView.selectedTeamId]?.tasks.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>タイトル</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>担当者</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>ステータス</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>作成日</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditView.teamData[auditView.selectedTeamId].tasks.map((task) => (
                          <tr key={task.id}>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{task.title || '(タイトルなし)'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{task.person_in_charge || '-'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                              {task.status === 'completed' ? '✅ 完了' : task.status === 'in-progress' ? '🔄 進行中' : '📋 計画中'}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                              {task.created_at ? new Date(task.created_at).toLocaleDateString('ja-JP') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: "#666", padding: "20px", textAlign: "center" }}>データがありません</p>
                  )}
                </div>
              )}

              {auditView.selectedDataType === 'reports' && (
                <div>
                  <h3>完了報告一覧</h3>
                  {auditView.teamData[auditView.selectedTeamId]?.reports.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>報告番号</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>タイトル</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>担当者</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>作成日</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", width: "100px" }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditView.teamData[auditView.selectedTeamId].reports.map((report) => (
                          <tr key={report.id}>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{report.report_number || '-'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{report.title || '(タイトルなし)'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{report.person_in_charge || '-'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                              {report.created_at ? new Date(report.created_at).toLocaleDateString('ja-JP') : '-'}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>
                              <button
                                onClick={() => {
                                  // 報告書データを整形してプレビューモーダルに渡す
                                  const reportPreviewData = {
                                    ...report.report_data,
                                    reportNumber: report.report_number,
                                    team: teamsList.find(t => t.id === report.team_id)?.name || report.team_id,
                                    createdAt: report.created_at
                                  }
                                  setPreviewData(reportPreviewData)
                                  setShowReportPreview(true)
                                }}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#17a2b8",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "13px"
                                }}
                              >
                                📄 詳細
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: "#666", padding: "20px", textAlign: "center" }}>データがありません</p>
                  )}
                </div>
              )}

              {auditView.selectedDataType === 'patrols' && (
                <div>
                  <h3>パトロール履歴</h3>
                  {auditView.teamData[auditView.selectedTeamId]?.patrols.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>監査日</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>監査チーム</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>監査者</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>総合点</th>
                          <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", width: "100px" }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditView.teamData[auditView.selectedTeamId].patrols.map((patrol) => (
                          <tr key={patrol.id}>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                              {patrol.basicInfo?.auditDate || '-'}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{patrol.basicInfo?.auditorTeam || '-'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px" }}>{patrol.basicInfo?.auditorPerson || '-'}</td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", fontWeight: "bold", color: patrol.totalScore >= 80 ? "#28a745" : patrol.totalScore >= 60 ? "#ffc107" : "#dc3545" }}>
                              {patrol.totalScore || 0}点
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>
                              <button
                                onClick={() => {
                                  setAuditView(prev => ({
                                    ...prev,
                                    showPatrolDetail: true,
                                    selectedPatrol: patrol
                                  }))
                                }}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#28a745",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "13px"
                                }}
                              >
                                ✅ 詳細
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: "#666", padding: "20px", textAlign: "center" }}>データがありません</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* パトロール詳細モーダル（監査ビュー用） */}
      {auditView.showPatrolDetail && auditView.selectedPatrol && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "0",
            borderRadius: "8px",
            width: "95%",
            maxWidth: "1000px",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* ヘッダー */}
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #dee2e6",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px 8px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, color: "#333" }}>
                ✅ パトロールチェックシート詳細
              </h3>
              <button
                onClick={() => setAuditView(prev => ({ ...prev, showPatrolDetail: false, selectedPatrol: null }))}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                ✕ 閉じる
              </button>
            </div>

            {/* コンテンツ */}
            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "30px"
            }}>
              <div style={{
                backgroundColor: "white",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "25px"
              }}>
                {/* タイトル */}
                <h3 style={{
                  margin: "0 0 20px 0",
                  color: "#007bff",
                  fontSize: "20px",
                  borderBottom: "2px solid #007bff",
                  paddingBottom: "10px"
                }}>
                  📋 {auditView.selectedPatrol.basicInfo.auditedTeam} パトロール結果
                </h3>

                {/* 基本情報グリッド */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "15px",
                  marginBottom: "25px",
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "6px"
                }}>
                  <div>
                    <strong style={{ color: "#666" }}>監査日:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditDate}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>所要時間:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.duration || 0}分</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>被監査チーム:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditedTeam}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>監査チーム:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditorTeam}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>被監査承認者:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditedApprover}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>監査承認者:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditorApprover}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>被監査担当者:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditedPerson}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>監査担当者:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.auditorPerson}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>保存日時:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{new Date(auditView.selectedPatrol.savedAt).toLocaleString('ja-JP')}</div>
                  </div>
                  <div>
                    <strong style={{ color: "#666" }}>監査時間:</strong>
                    <div style={{ marginTop: "5px", fontSize: "16px" }}>{auditView.selectedPatrol.basicInfo.startTime} ～ {auditView.selectedPatrol.basicInfo.endTime}</div>
                  </div>
                </div>

                {/* スコア情報 */}
                <div style={{
                  marginBottom: "25px",
                  padding: "20px",
                  backgroundColor: "#e7f3ff",
                  borderRadius: "6px",
                  border: "1px solid #007bff"
                }}>
                  <h4 style={{ margin: "0 0 15px 0", color: "#007bff", fontSize: "16px" }}>📊 評価スコア</h4>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "10px",
                    textAlign: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>合計点数</div>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#007bff" }}>
                        {auditView.selectedPatrol.totalScore}点
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>前回点差</div>
                      <div style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: auditView.selectedPatrol.scoreDifference > 0 ? "#28a745" :
                               auditView.selectedPatrol.scoreDifference < 0 ? "#dc3545" : "#333"
                      }}>
                        {auditView.selectedPatrol.scoreDifference > 0 ? "+" : ""}{auditView.selectedPatrol.scoreDifference}点
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>5点</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{auditView.selectedPatrol.scoreCounts[5]}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>4点</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{auditView.selectedPatrol.scoreCounts[4]}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>3点</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{auditView.selectedPatrol.scoreCounts[3]}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>2点</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{auditView.selectedPatrol.scoreCounts[2]}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#666" }}>1点</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{auditView.selectedPatrol.scoreCounts[1]}</div>
                    </div>
                  </div>
                </div>

                {/* 評価詳細 */}
                {Object.keys(auditView.selectedPatrol.evaluations).length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>📝 評価詳細（5S項目）</h4>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 60px",
                      gap: "10px",
                      fontSize: "14px"
                    }}>
                      <div style={{ fontWeight: "bold", padding: "8px", backgroundColor: "#f8f9fa", textAlign: "center" }}>項目</div>
                      <div style={{ fontWeight: "bold", padding: "8px", backgroundColor: "#f8f9fa", textAlign: "center" }}>内容</div>
                      <div style={{ fontWeight: "bold", padding: "8px", backgroundColor: "#f8f9fa", textAlign: "center" }}>評価</div>
                      {Object.entries(auditView.selectedPatrol.evaluations).map(([itemNum, score]) => {
                        const items = [
                          '整理：不要品は無いか',
                          '整頓：正しく戻されているか',
                          '清掃：清掃・点検されているか',
                          '清潔：3S基準が守られているか',
                          '躾：ルール・安全が守られているか',
                          '設備保全：始業点検・日常点検',
                          '見える化：進捗・納期が見えるか',
                          '環境：整理・整頓されているか',
                          '安全：危険箇所・不安全行為',
                          '報告書：記録・報告がされているか'
                        ]
                        return (
                          <React.Fragment key={itemNum}>
                            <div style={{ padding: "8px", backgroundColor: "#fff", border: "1px solid #dee2e6", textAlign: "center" }}>
                              №{itemNum}
                            </div>
                            <div style={{ padding: "8px", backgroundColor: "#fff", border: "1px solid #dee2e6" }}>
                              {items[parseInt(itemNum) - 1]}
                            </div>
                            <div style={{
                              padding: "8px",
                              backgroundColor: score === 5 ? "#d4edda" :
                                             score === 4 ? "#d1ecf1" :
                                             score === 3 ? "#fff3cd" :
                                             score === 2 ? "#f8d7da" :
                                             score === 1 ? "#f5c6cb" : "#fff",
                              border: "1px solid #dee2e6",
                              textAlign: "center",
                              fontWeight: "bold",
                              color: score <= 2 ? "#721c24" : "#000"
                            }}>
                              {score}点
                            </div>
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* コメント */}
                {Object.keys(auditView.selectedPatrol.comments).length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>💬 評価コメント・改善提案</h4>
                    <div style={{
                      padding: "15px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      border: "1px solid #dee2e6"
                    }}>
                      {Object.entries(auditView.selectedPatrol.comments).map(([key, comment]) => (
                        comment.trim() && (
                          <div key={key} style={{
                            marginBottom: "12px",
                            paddingBottom: "12px",
                            borderBottom: "1px solid #dee2e6"
                          }}>
                            <div style={{ fontWeight: "bold", color: "#666", marginBottom: "5px" }}>
                              {key === '1-4' ? '№1～4' : key === '5-7' ? '№5～7' : key === '8-10' ? '№8～10' : key}
                            </div>
                            <div style={{ fontSize: "14px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                              {comment}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* ISO監査項目 */}
                {auditView.selectedPatrol.isoItems && Object.keys(auditView.selectedPatrol.isoItems).length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#6f42c1", fontSize: "16px" }}>
                      📋 ISO9001 規格要求事項 監査欄
                    </h4>
                    {Object.entries(auditView.selectedPatrol.isoItems).map(([index, item]) => (
                      (item.code || item.content || item.rating || item.evidence) && (
                        <div key={index} style={{
                          marginBottom: "20px",
                          padding: "15px",
                          backgroundColor: "#f0f0ff",
                          borderRadius: "6px",
                          border: "1px solid #6f42c1"
                        }}>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px", marginBottom: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#6f42c1" }}>規格番号:</div>
                            <div>{item.code || '（未入力）'}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px", marginBottom: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#6f42c1" }}>監査内容:</div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{item.content || '（未入力）'}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px", marginBottom: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#6f42c1" }}>評価区分:</div>
                            <div>
                              <span style={{
                                padding: "4px 12px",
                                backgroundColor: item.rating === '長所' ? "#d4edda" :
                                               item.rating === '気づき' ? "#fff3cd" :
                                               item.rating === '観察' ? "#d1ecf1" : "#f8f9fa",
                                borderRadius: "4px",
                                fontWeight: "bold"
                              }}>
                                {item.rating || '（未選択）'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#6f42c1" }}>証拠確認:</div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{item.evidence || '（未入力）'}</div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 活動報告書プレビューモーダル */}
      {showReportPreview && previewData && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "0",
            borderRadius: "8px",
            width: "95%",
            maxWidth: "1200px",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* プレビューヘッダー */}
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #dee2e6",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px 8px 0 0"
            }}>
              <h3 style={{ margin: 0, color: "#333" }}>📊 活動報告書プレビュー</h3>
            </div>

            {/* プレビューコンテンツ */}
            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "20px"
            }}>
              <div id="report-preview-content" style={{
                backgroundColor: "white",
                padding: "40px",
                fontFamily: "serif",
                lineHeight: "1.8", // 行間を広げて読みやすく
                border: "2px solid #000",
                width: "794px", // A4幅に固定
                height: "1123px", // A4高さに固定
                margin: "0 auto", // 中央揃え
                boxSizing: "border-box",
                overflow: "hidden" // はみ出し防止
              }}>
                {/* ヘッダー */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid black", paddingBottom: "10px" }}>
                  <h1 style={{ fontSize: "32px", margin: 0 }}>MKG 活動報告書</h1>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "16px" }}>チーム名</span>
                    <h2 style={{
                      fontSize: previewData.team?.length > 20 ? "16px" : previewData.team?.length > 15 ? "20px" : "26px",
                      margin: "0",
                      color: "#000000",
                      whiteSpace: "nowrap",
                      overflow: "visible"
                    }}>{previewData.team}</h2>
                  </div>
                </div>

                {/* 基本情報テーブル */}
                <div style={{ marginTop: "20px", border: "1px solid #ccc" }}>
                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>タイトル</div>
                    <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #ccc" }}>{previewData.title}</div>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>改善No.</div>
                    <div style={{ width: "150px", padding: "8px", fontWeight: "bold", color: "#28a745" }}>{previewData.reportNumber || '保存時に自動付与'}</div>
                  </div>
                  
                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>活動期間</div>
                    <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #ccc" }}>{previewData.period}</div>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>担当者</div>
                    <div style={{ width: "150px", padding: "8px" }}>{previewData.personInCharge}</div>
                  </div>
                  
                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>場所</div>
                    <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #ccc" }}>{previewData.place}</div>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>カテゴリ</div>
                    <div style={{ width: "150px", padding: "8px" }}>{getCategoryDisplay(previewData.fiveSMethod)}</div>
                  </div>

                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>問題点</div>
                    <div style={{ flex: 1, padding: "8px", minHeight: "40px", maxHeight: "80px", overflow: "hidden", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.4" }}>{previewData.problem}</div>
                  </div>

                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>カイゼン方法</div>
                    <div style={{ flex: 1, padding: "8px", minHeight: "40px", maxHeight: "80px", overflow: "hidden", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.4" }}>{previewData.kaizenContent}</div>
                  </div>

                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>カイゼン効果</div>
                    <div style={{ flex: 1, padding: "8px", minHeight: "40px", maxHeight: "80px", overflow: "hidden", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.4" }}>{previewData.kaizenEffect}</div>
                  </div>

                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    {previewData.beforeImage ? (
                      <>
                        <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #ccc" }}>
                          <h4 style={{ textAlign: "center", margin: "0 0 8px 0", fontSize: "14px" }}>カイゼン前 (Before)</h4>
                          <div style={{ minHeight: "225px", maxHeight: "275px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
                            <img
                              src={previewData.beforeImage}
                              alt="Before"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "255px",
                                objectFit: "contain",
                                borderRadius: "4px"
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ flex: 1, padding: "8px" }}>
                          <h4 style={{ textAlign: "center", margin: "0 0 8px 0", fontSize: "14px" }}>カイゼン後 (After)</h4>
                          <div style={{ minHeight: "225px", maxHeight: "275px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
                            {previewData.afterImage ? (
                              <img
                                src={previewData.afterImage}
                                alt="After"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "255px",
                                  objectFit: "contain",
                                  borderRadius: "4px"
                                }}
                              />
                            ) : (
                              <span style={{ color: "#666" }}>画像未設定</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, padding: "8px" }}>
                        <h4 style={{ textAlign: "center", margin: "0 0 8px 0", fontSize: "14px" }}>カイゼン後 (After)</h4>
                        <div style={{ minHeight: "225px", maxHeight: "275px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
                          {previewData.afterImage ? (
                            <img
                              src={previewData.afterImage}
                              alt="After"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "255px",
                                objectFit: "contain",
                                borderRadius: "4px"
                              }}
                            />
                          ) : (
                            <span style={{ color: "#666" }}>画像未設定</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>改善後の<br/>経過確認</div>
                    <div style={{ width: "80px", padding: "8px", borderRight: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>{previewData.followUpCheck}</div>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>完了・継続</div>
                    <div style={{ width: "80px", padding: "8px", borderRight: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>{previewData.completionStatus}</div>
                  </div>
                  
                  <div style={{ display: "flex" }}>
                    <div style={{ width: "120px", padding: "8px", backgroundColor: "#f8f9fa", fontWeight: "bold", borderRight: "1px solid #ccc" }}>経過確認コメント</div>
                    <div style={{ flex: 1, padding: "8px", minHeight: "60px", maxHeight: "120px", overflow: "hidden", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.4" }}>{previewData.progressComment}</div>
                  </div>
                </div>

                {/* フッター */}
                <div style={{ textAlign: "right", marginTop: "20px", fontSize: "14px", color: "#666" }}>
                  MAST 株式会社 竹内型材研究所
                </div>
              </div>
            </div>

            {/* プレビューフッター */}
            <div style={{
              padding: "20px",
              borderTop: "1px solid #dee2e6",
              backgroundColor: "#f8f9fa",
              borderRadius: "0 0 8px 8px",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px"
            }}>
              <button
                onClick={() => setShowReportPreview(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                閉じる
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                {previewData?.reportNumber && previewData.reportNumber !== '未設定' && previewData.reportNumber !== '保存時に自動付与' ? (
                  <>
                    <button
                      onClick={handleSavePDF}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      📄 PDF保存
                    </button>
                    <button
                      onClick={handleSaveJPEG}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#fd7e14",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      🖼️ JPEG保存
                    </button>
                  </>
                ) : (
                  <div style={{
                    padding: "10px 20px",
                    backgroundColor: "#f8f9fa",
                    color: "#666",
                    borderRadius: "4px",
                    fontSize: "14px",
                    border: "1px solid #dee2e6",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span style={{ fontSize: "16px" }}>ℹ️</span>
                    <span>報告書を保存すると改善№が付与され、PDF/JPEG化が可能になります</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知エリア */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{
                backgroundColor: toast.type === 'success' ? '#10b981' :
                                toast.type === 'error' ? '#ef4444' :
                                toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                maxWidth: '300px',
                fontSize: '14px',
                lineHeight: '1.4',
                animation: 'slideInFromRight 0.3s ease-out'
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}


      {/* トースト通知のアニメーション用CSS */}
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

          {showReportForm && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "900px",
                maxHeight: "80vh",
                overflowY: "auto"
              }}>
                <div style={{ marginBottom: "20px" }}>
                  <h3>📊 活動報告書編集</h3>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    改善No.: {reportEditSource === 'report' && reportData?.reportNumber ? '' : completedReports.length === 0 ? '(1枚目は手動入力)' : '(自動生成)'}
                  </label>
                  {/* 編集モード：既存番号を表示 */}
                  {reportEditSource === 'report' && reportData?.reportNumber ? (
                    <div style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      color: "#28a745",
                      fontWeight: "bold"
                    }}>
                      {reportData.reportNumber}
                    </div>
                  ) : completedReports.length === 0 ? (
                    /* 1枚目：手動入力 */
                    <input
                      type="text"
                      value={reportData?.reportNumber || ''}
                      onChange={(e) => setReportData({...(reportData || {}), reportNumber: e.target.value})}
                      placeholder="例: GR-2510-0361"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  ) : (
                    /* 2枚目以降：自動生成メッセージ */
                    <div style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      color: "#28a745",
                      fontWeight: "bold"
                    }}>
                      保存時に自動生成されます
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>タイトル:</label>
                    <input
                      type="text"
                      value={reportData?.title || ''}
                      onChange={(e) => setReportData({...(reportData || {}), title: e.target.value})}
                      placeholder="活動報告書のタイトルを入力"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>チーム名:</label>
                    <input
                      type="text"
                      value={reportData?.team || ''}
                      onChange={(e) => setReportData({...(reportData || {}), team: e.target.value})}
                      placeholder="チーム名、もしくはPK・PP・OR合同などを入力"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>活動期間:</label>
                  <input
                    type="text"
                    value={reportData?.period || ''}
                    onChange={(e) => setReportData({...(reportData || {}), period: e.target.value})}
                    placeholder="例: 2025/01/01 〜 2025/01/31"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>担当者:</label>
                    <input
                      type="text"
                      value={reportData?.personInCharge || ''}
                      onChange={(e) => setReportData({...(reportData || {}), personInCharge: e.target.value})}
                      placeholder="担当者名を入力"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>場所:</label>
                    <input
                      type="text"
                      value={reportData?.place || ''}
                      onChange={(e) => setReportData({...(reportData || {}), place: e.target.value})}
                      placeholder="場所を入力"
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カテゴリ:</label>
                    <select
                      value={reportData?.fiveSMethod || ''}
                      onChange={(e) => setReportData({...(reportData || {}), fiveSMethod: e.target.value})}
                      style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    >
                      <option value="">選択してください</option>
                      {kaizenCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name} ({category.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>問題点:</label>
                  <textarea
                    value={reportData?.problem || ''}
                    onChange={(e) => setReportData({...(reportData || {}), problem: e.target.value})}
                    placeholder="改善前の問題点を入力..."
                    style={{ width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カイゼン内容:</label>
                  <textarea
                    value={reportData?.kaizenContent || ''}
                    onChange={(e) => setReportData({...(reportData || {}), kaizenContent: e.target.value})}
                    placeholder="実施したカイゼン内容を入力..."
                    style={{ width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>カイゼン効果:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(reportData?.kaizenEffect || '', 'kaizenEffect')
                        setReportData({...(reportData || {}), kaizenEffect: correctedText})
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={reportData?.kaizenEffect || ''}
                    onChange={(e) => setReportData({...(reportData || {}), kaizenEffect: e.target.value})}
                    placeholder="改善によってどのような効果があったか記述..."
                    style={{ width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical" }}
                  />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カイゼン前 (Before):</label>
                    <div 
                      style={{
                        border: "2px dashed #ddd",
                        padding: "20px",
                        borderRadius: "4px",
                        backgroundColor: "#fafafa",
                        minHeight: "250px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#007bff"
                        e.currentTarget.style.backgroundColor = "#e3f2fd"
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#ddd"
                        e.currentTarget.style.backgroundColor = "#fafafa"
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#ddd"
                        e.currentTarget.style.backgroundColor = "#fafafa"
                        const files = e.dataTransfer.files
                        if (files && files[0]) {
                          const file = files[0]
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const img = e.currentTarget.querySelector('.image-preview')
                              if (img) {
                                img.src = event.target.result
                                img.style.display = 'block'
                              }
                              const placeholder = e.currentTarget.querySelector('.placeholder-content')
                              if (placeholder) {
                                placeholder.style.display = 'none'
                              }
                              // reportDataのbeforeImageを更新
                              setReportData({...(reportData || {}), beforeImage: event.target.result})
                            }
                            reader.readAsDataURL(file)
                          }
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const items = e.clipboardData.items
                        const container = e.currentTarget
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i]
                          if (item.type.indexOf('image') !== -1) {
                            const file = item.getAsFile()
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                if (container) {
                                  const img = container.querySelector('.image-preview')
                                  const placeholder = container.querySelector('.placeholder-content')
                                  if (img && placeholder) {
                                    img.src = event.target.result
                                    img.style.display = 'block'
                                    placeholder.style.display = 'none'
                                  }
                                }
                                // reportDataのbeforeImageを更新
                                setReportData({...(reportData || {}), beforeImage: event.target.result})
                              }
                              reader.readAsDataURL(file)
                              break
                            }
                          }
                        }
                      }}
                      tabIndex={0}
                      onClick={() => document.getElementById('before-file').click()}
                    >
                      <div style={{ position: "relative", display: reportData?.beforeImage ? "block" : "none" }}>
                        <img 
                          className="image-preview"
                          src={reportData?.beforeImage || ''}
                          style={{ 
                            display: "block", 
                            maxWidth: "100%", 
                            maxHeight: "350px", 
                            borderRadius: "4px",
                            objectFit: "contain"
                          }} 
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReportData({...(reportData || {}), beforeImage: ''})
                          }}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            backgroundColor: "rgba(255, 0, 0, 0.8)",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "15px",
                            cursor: "pointer",
                            fontWeight: "bold"
                          }}
                          title="画像を削除"
                        >
                          ×削除
                        </button>
                      </div>
                      
                      <div className="placeholder-content" style={{ display: reportData?.beforeImage ? "none" : "block" }}>
                        <p style={{ margin: "0 0 15px 0", color: "#666", fontWeight: "bold", fontSize: "1.1em" }}>📷 Before画像</p>
                        
                        <div style={{ marginBottom: "15px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              document.getElementById('before-file').click()
                            }}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "1em",
                              fontWeight: "bold"
                            }}
                          >
                            📁 ファイルを選択
                          </button>
                        </div>
                        
                        <p style={{ margin: 0, color: "#999", fontSize: "0.9em" }}>
                          または画像をここにドラッグ&ドロップ<br/>
                          <strong>Ctrl+V (Cmd+V) でクリップボードから貼り付け</strong>
                        </p>
                      </div>
                      
                      <input 
                        id="before-file" 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0]
                            const reader = new FileReader()
                            const container = e.target.parentElement
                            reader.onload = (event) => {
                              const img = container.querySelector('.image-preview')
                              const placeholder = container.querySelector('.placeholder-content')
                              if (img && placeholder) {
                                img.src = event.target.result
                                img.style.display = 'block'
                                placeholder.style.display = 'none'
                              }
                              // reportDataのbeforeImageを更新
                              setReportData({...(reportData || {}), beforeImage: event.target.result})
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>カイゼン後 (After):</label>
                    <div 
                      style={{
                        border: "2px dashed #ddd",
                        padding: "20px",
                        borderRadius: "4px",
                        backgroundColor: "#fafafa",
                        minHeight: "250px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#28a745"
                        e.currentTarget.style.backgroundColor = "#e8f5e8"
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#ddd"
                        e.currentTarget.style.backgroundColor = "#fafafa"
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = "#ddd"
                        e.currentTarget.style.backgroundColor = "#fafafa"
                        const files = e.dataTransfer.files
                        if (files && files[0]) {
                          const file = files[0]
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const img = e.currentTarget.querySelector('.image-preview')
                              if (img) {
                                img.src = event.target.result
                                img.style.display = 'block'
                              }
                              const placeholder = e.currentTarget.querySelector('.placeholder-content')
                              if (placeholder) {
                                placeholder.style.display = 'none'
                              }
                              // reportDataのafterImageを更新
                              setReportData({...(reportData || {}), afterImage: event.target.result})
                            }
                            reader.readAsDataURL(file)
                          }
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const items = e.clipboardData.items
                        const container = e.currentTarget
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i]
                          if (item.type.indexOf('image') !== -1) {
                            const file = item.getAsFile()
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                if (container) {
                                  const img = container.querySelector('.image-preview')
                                  const placeholder = container.querySelector('.placeholder-content')
                                  if (img && placeholder) {
                                    img.src = event.target.result
                                    img.style.display = 'block'
                                    placeholder.style.display = 'none'
                                  }
                                }
                                // reportDataのafterImageを更新
                                setReportData({...(reportData || {}), afterImage: event.target.result})
                              }
                              reader.readAsDataURL(file)
                              break
                            }
                          }
                        }
                      }}
                      tabIndex={0}
                      onClick={() => document.getElementById('after-file').click()}
                    >
                      <div style={{ position: "relative", display: reportData?.afterImage ? "block" : "none" }}>
                        <img 
                          className="image-preview"
                          src={reportData?.afterImage || ''}
                          style={{ 
                            display: "block", 
                            maxWidth: "100%", 
                            maxHeight: "350px", 
                            borderRadius: "4px",
                            objectFit: "contain"
                          }} 
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReportData({...(reportData || {}), afterImage: ''})
                          }}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            backgroundColor: "rgba(255, 0, 0, 0.8)",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "15px",
                            cursor: "pointer",
                            fontWeight: "bold"
                          }}
                          title="画像を削除"
                        >
                          ×削除
                        </button>
                      </div>
                      
                      <div className="placeholder-content" style={{ display: reportData?.afterImage ? "none" : "block" }}>
                        <p style={{ margin: "0 0 15px 0", color: "#666", fontWeight: "bold", fontSize: "1.1em" }}>📷 After画像</p>
                        
                        <div style={{ marginBottom: "15px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              document.getElementById('after-file').click()
                            }}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "1em",
                              fontWeight: "bold"
                            }}
                          >
                            📁 ファイルを選択
                          </button>
                        </div>
                        
                        <p style={{ margin: 0, color: "#999", fontSize: "0.9em" }}>
                          または画像をここにドラッグ&ドロップ<br/>
                          <strong>Ctrl+V (Cmd+V) でクリップボードから貼り付け</strong>
                        </p>
                      </div>
                      
                      <input 
                        id="after-file" 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0]
                            const reader = new FileReader()
                            const container = e.target.parentElement
                            reader.onload = (event) => {
                              const img = container.querySelector('.image-preview')
                              const placeholder = container.querySelector('.placeholder-content')
                              if (img && placeholder) {
                                img.src = event.target.result
                                img.style.display = 'block'
                                placeholder.style.display = 'none'
                              }
                              // reportDataのafterImageを更新
                              setReportData({...(reportData || {}), afterImage: event.target.result})
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  {/* 経過確認の要不要選択 */}
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>経過確認:</label>
                    <div style={{ display: "flex", gap: "15px" }}>
                      <label style={{ display: "flex", alignItems: "center", fontSize: "0.9em" }}>
                        <input
                          type="radio"
                          name="followUpRequired"
                          value="要"
                          checked={followUpRequired === '要'}
                          onChange={(e) => setFollowUpRequired(e.target.value)}
                          style={{ marginRight: "5px" }}
                        />
                        要
                      </label>
                      <label style={{ display: "flex", alignItems: "center", fontSize: "0.9em" }}>
                        <input
                          type="radio"
                          name="followUpRequired"
                          value="不要"
                          checked={followUpRequired === '不要'}
                          onChange={(e) => setFollowUpRequired(e.target.value)}
                          style={{ marginRight: "5px" }}
                        />
                        不要
                      </label>
                    </div>
                  </div>

                  {/* 完了・継続の選択 */}
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>状態:</label>
                    <div style={{ display: "flex", gap: "15px" }}>
                      <label style={{ display: "flex", alignItems: "center", fontSize: "0.9em" }}>
                        <input
                          type="radio"
                          name="completionStatus"
                          value="完了"
                          checked={completionStatus === '完了'}
                          onChange={(e) => setCompletionStatus(e.target.value)}
                          style={{ marginRight: "5px" }}
                        />
                        完了
                      </label>
                      <label style={{ display: "flex", alignItems: "center", fontSize: "0.9em" }}>
                        <input
                          type="radio"
                          name="completionStatus"
                          value="継続"
                          checked={completionStatus === '継続'}
                          onChange={(e) => setCompletionStatus(e.target.value)}
                          style={{ marginRight: "5px" }}
                        />
                        継続
                      </label>
                    </div>
                  </div>
                </div>

                {/* 経過確認コメント */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "5px", gap: "10px" }}>
                    <label style={{ fontWeight: "bold" }}>経過確認コメント:</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const correctedText = await handleAIProofread(reportData?.progressComment || '', 'progressComment')
                        setReportData({...(reportData || {}), progressComment: correctedText})
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#6f42c1",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8em",
                        cursor: "pointer"
                      }}
                    >
                      🤖 AI校正・リライト
                    </button>
                  </div>
                  <textarea
                    value={reportData?.progressComment || ''}
                    onChange={(e) => setReportData({...(reportData || {}), progressComment: e.target.value})}
                    placeholder="改善の経過や結果、効果について詳しく記述..."
                    style={{ width: "100%", minHeight: "150px", padding: "12px", border: "1px solid #ddd", borderRadius: "4px", resize: "vertical", fontSize: "14px", lineHeight: "1.5" }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      // タスクを元の状態に戻す
                      if (selectedKaizenTask && originalTaskStatus) {
                        const currentTask = tasks.find(t => t.id === selectedKaizenTask.id)
                        if (currentTask && currentTask.status !== originalTaskStatus) {
                          // 元の状態に戻すため、タスクのステータスを直接設定
                          setTasks(tasks.map(task => 
                            task.id === selectedKaizenTask.id 
                              ? { ...task, status: originalTaskStatus }
                              : task
                          ))
                        }
                      }
                      setShowReportForm(false)
                      setSelectedKaizenTask(null)
                      setOriginalTaskStatus(null)
                    }}
                    style={{ padding: "10px 20px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={async () => {
                      // 一次保存：Supabaseに下書きとして保存
                      if (!selectedKaizenTask || !reportData) {
                        showToast('保存するデータがありません', 'error')
                        return
                      }

                      try {
                        // 下書きとしてSupabaseに保存（is_draft = true, report_number = null）
                        const { data: existingDrafts } = await supabase
                          .from('completed_reports')
                          .select('*')
                          .eq('task_id', selectedKaizenTask.originalTaskId || selectedKaizenTask.id)
                          .eq('team_id', selectedTeam.id)
                          .eq('is_draft', true)

                        if (existingDrafts && existingDrafts.length > 0) {
                          // 既存の下書きを更新
                          const { error } = await supabase
                            .from('completed_reports')
                            .update({
                              title: reportData.title,
                              report_data: reportData,
                              is_draft: true,
                              report_number: null // 下書きには番号なし
                            })
                            .eq('task_id', selectedKaizenTask.originalTaskId || selectedKaizenTask.id)
                            .eq('team_id', selectedTeam.id)
                            .eq('is_draft', true)

                          if (error) {
                            console.error('下書き更新エラー:', error)
                            showToast('下書きの更新に失敗しました', 'error')
                          } else {
                            console.log('✅ 下書きを更新しました')
                            showToast('下書きを更新しました', 'success')
                            // 報告書一覧を再読み込み
                            const savedReports = await loadActivityReportsFromSupabase()
                            setCompletedReports(savedReports)
                            setShowReportForm(false)
                            setReportData(null)
                            setSelectedKaizenTask(null)
                          }
                        } else {
                          // 新規下書きを作成
                          const { error } = await supabase
                            .from('completed_reports')
                            .insert({
                              task_id: selectedKaizenTask.originalTaskId || selectedKaizenTask.id,
                              team_id: selectedTeam.id,
                              title: reportData.title,
                              report_data: reportData,
                              is_draft: true,
                              report_number: null // 下書きには番号なし
                            })

                          if (error) {
                            console.error('下書き保存エラー:', error)
                            showToast('下書きの保存に失敗しました', 'error')
                          } else {
                            console.log('✅ 下書きを保存しました')
                            showToast('下書きとして保存しました', 'success')
                            // 報告書一覧を再読み込み
                            const savedReports = await loadActivityReportsFromSupabase()
                            setCompletedReports(savedReports)
                            setShowReportForm(false)
                            setReportData(null)
                            setSelectedKaizenTask(null)
                          }
                        }
                      } catch (error) {
                        console.error('下書き保存エラー:', error)
                        showToast('下書きの保存に失敗しました', 'error')
                      }
                    }}
                    style={{ padding: "10px 20px", backgroundColor: "#ffc107", color: "black", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "10px", fontWeight: "bold" }}
                  >
                    📝 下書き保存
                  </button>
                  <button
                    onClick={() => {
                      // プレビューデータを設定
                      setPreviewData({
                        ...(reportData || {}),
                        followUpCheck: followUpRequired,
                        completionStatus: completionStatus,
                        createdDate: new Date().toLocaleDateString('ja-JP'),
                        createdBy: currentUser?.username
                      })
                      setShowReportPreview(true)
                    }}
                    style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    📊 プレビュー
                  </button>
                  <button
                    onClick={() => {
                      // 編集内容をタスクのkaizenDataに保存
                      if (selectedKaizenTask && reportData) {
                        const updatedTasks = tasks.map(task => {
                          if (task.id === selectedKaizenTask.id) {
                            return {
                              ...task,
                              kaizenData: {
                                ...task.kaizenData,
                                reportData: reportData,
                                // 基本データも更新
                                personInCharge: reportData.personInCharge,
                                place: reportData.place,
                                fiveSMethod: reportData.fiveSMethod,
                                kaizenEffect: reportData.kaizenEffect,
                                beforeImage: reportData.beforeImage,
                                afterImage: reportData.afterImage,
                                progressComment: reportData.progressComment
                              }
                            }
                          }
                          return task
                        })
                        setTasks(updatedTasks)

                        // Supabaseに報告書を保存して即座に再読み込み
                        const saveReport = async () => {
                          // 報告書編集の場合はUPDATE、新規作成の場合はINSERT
                          if (reportEditSource === 'report') {
                            // 編集モード：既存の報告書を更新（is_draft: false = 完成版）
                            const { error } = await supabase
                              .from('completed_reports')
                              .update({
                                title: reportData.title,
                                report_data: reportData,
                                is_draft: false // 本保存なので完成版
                              })
                              .eq('task_id', selectedKaizenTask.originalTaskId || selectedKaizenTask.id)
                              .eq('team_id', selectedTeam.id)

                            if (error) {
                              console.error('報告書更新エラー:', error.message)
                            } else {
                              console.log('✅ 報告書を更新しました')
                              // Supabaseから最新データを再読み込み
                              const savedReports = await loadActivityReportsFromSupabase()
                              console.log('📋 再読み込み完了:', savedReports.length, '件')
                              setCompletedReports(savedReports)
                            }
                          } else {
                            // 新規作成モード（既存チェック付きUPSERT）
                            // まず同じtask_idの報告書が存在するか確認
                            const { data: existingReports } = await supabase
                              .from('completed_reports')
                              .select('*')
                              .eq('task_id', selectedKaizenTask.id)
                              .eq('team_id', selectedTeam.id)

                            if (existingReports && existingReports.length > 0) {
                              // 既存の報告書を更新（下書きを本保存に変換する場合もここ）
                              const existingReport = existingReports[0]
                              const isDraftToFinal = existingReport.is_draft === true // 下書きから本保存への変換

                              // 改善№の処理
                              let finalReportNumber = existingReport.report_number

                              // 下書きから本保存への変換、または既存報告書にreport_numberがない場合は新規付与
                              if (isDraftToFinal || !finalReportNumber) {
                                // 改善№を新規付与
                                const { data: latestReports } = await supabase
                                  .from('completed_reports')
                                  .select('report_number')
                                  .eq('team_id', selectedTeam.id)
                                  .not('report_number', 'is', null)
                                  .order('created_at', { ascending: false })
                                  .limit(1)

                                if (latestReports && latestReports.length > 0) {
                                  const lastNumber = latestReports[0].report_number
                                  const parts = lastNumber.split('-')
                                  if (parts.length === 3) {
                                    const lastSeq = parseInt(parts[2])
                                    const nextSeq = String(lastSeq + 1).padStart(4, '0')
                                    const period = reportData.period || ''
                                    let yearMonth = parts[1]
                                    const dateMatch = period.match(/(\d{4})\/(\d{1,2})\/\d{1,2}\s*[~～]\s*(\d{4})\/(\d{1,2})\/\d{1,2}/)
                                    if (dateMatch) {
                                      const endYear = dateMatch[3].slice(2)
                                      const endMonth = dateMatch[4].padStart(2, '0')
                                      yearMonth = endYear + endMonth
                                    }
                                    finalReportNumber = `${selectedTeam.id}-${yearMonth}-${nextSeq}`
                                    console.log('📊 報告書ナンバー生成:', finalReportNumber)
                                  }
                                } else if (reportData.reportNumber) {
                                  // 1枚目の場合
                                  finalReportNumber = reportData.reportNumber
                                  console.log('📊 報告書ナンバー（手動入力）:', finalReportNumber)
                                }
                              }

                              const { error } = await supabase
                                .from('completed_reports')
                                .update({
                                  title: reportData.title,
                                  report_data: reportData,
                                  is_draft: false, // 本保存なので完成版
                                  report_number: finalReportNumber
                                })
                                .eq('task_id', selectedKaizenTask.id)
                                .eq('team_id', selectedTeam.id)

                              if (error) {
                                console.error('報告書更新エラー:', error.message)
                              } else {
                                console.log('✅ 既存の報告書を更新しました')
                                // Supabaseから最新データを再読み込み
                                const savedReports = await loadActivityReportsFromSupabase()
                                console.log('📋 再読み込み完了:', savedReports.length, '件')
                                setCompletedReports(savedReports)
                              }
                            } else {
                              // 新規作成
                              // 📊 改善ナンバー生成
                              let nextReportNumber = reportData.reportNumber // 1枚目は手動入力値

                              // 2枚目以降：自動生成
                              const { data: existingReportsData } = await supabase
                                .from('completed_reports')
                                .select('report_number')
                                .eq('team_id', selectedTeam.id)
                                .order('created_at', { ascending: false })
                                .limit(1)

                              if (existingReportsData && existingReportsData.length > 0) {
                                const lastNumber = existingReportsData[0].report_number
                                if (lastNumber) {
                                  // 最新番号から連番部分を抽出して+1
                                  // 例: "GR-2510-0361" → 0361 → 0362
                                  const parts = lastNumber.split('-')
                                  if (parts.length === 3) {
                                    const lastSeq = parseInt(parts[2])
                                    const nextSeq = String(lastSeq + 1).padStart(4, '0')

                                    // 活動期間から年月を取得
                                    const period = reportData.period || ''
                                    let yearMonth = parts[1] // デフォルトは前回と同じ年月

                                    // 活動期間の終了日から年月を抽出
                                    // 例: "2025/10/15 ~ 2025/10/31" → "2510"
                                    const dateMatch = period.match(/(\d{4})\/(\d{1,2})\/\d{1,2}\s*[~～]\s*(\d{4})\/(\d{1,2})\/\d{1,2}/)
                                    if (dateMatch) {
                                      const endYear = dateMatch[3].slice(2) // "2025" → "25"
                                      const endMonth = dateMatch[4].padStart(2, '0')
                                      yearMonth = endYear + endMonth
                                    }

                                    nextReportNumber = `${parts[0]}-${yearMonth}-${nextSeq}`
                                  }
                                }
                              }

                              const { error } = await supabase
                                .from('completed_reports')
                                .insert({
                                  task_id: selectedKaizenTask.id,
                                  team_id: selectedTeam.id,
                                  title: reportData.title,
                                  report_data: reportData,
                                  report_number: nextReportNumber,
                                  is_draft: false // 本保存なので完成版
                                })

                              if (error) {
                                console.error('報告書保存エラー:', error.message)
                              } else {
                                console.log(`✅ 報告書をSupabaseに保存しました (改善No.${nextReportNumber})`)
                                // Supabaseから最新データを再読み込み
                                const savedReports = await loadActivityReportsFromSupabase()
                                console.log('📋 再読み込み完了:', savedReports.length, '件')
                                setCompletedReports(savedReports)
                              }
                            }
                          }
                        }
                        saveReport()
                      }

                      // 活動報告書作成完了後にタスクを完了状態に移動（新規作成時のみ）
                      if (selectedKaizenTask && reportEditSource !== 'report') {
                        setTasks(prevTasks => prevTasks.map(task => {
                          if (task.id === selectedKaizenTask.id) {
                            return { ...task, status: "completed", reportInProgress: false }
                          }
                          return task
                        }))

                        // Supabaseにタスクの完了状態を保存
                        const completedTask = tasks.find(t => t.id === selectedKaizenTask.id)
                        if (completedTask) {
                          supabase
                            .from('tasks')
                            .update({
                              status: "completed"
                            })
                            .eq('id', selectedKaizenTask.id)
                            .then(({ error }) => {
                              if (error) {
                                console.error('❌ タスク完了状態の保存エラー:', error)
                              } else {
                                console.log('✅ タスク完了状態をSupabaseに保存しました')
                              }
                            })
                        }
                      }

                      setShowReportForm(false);
                      setReportData(null);
                      setSelectedKaizenTask(null);
                      showToast('活動報告書が保存され、タスクが完了しました！', 'success');
                    }}
                    style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    報告書を保存
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* ヘルプモーダル */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "12px",
              maxWidth: "800px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
            }}>
            <h2 style={{ marginTop: 0, color: "#667eea", fontSize: "28px" }}>
              📖 MKGカイゼン活動管理アプリ 使い方ガイド
            </h2>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                🚀 アプリのインストール方法
              </h3>

              <div style={{ marginLeft: "20px", marginTop: "15px" }}>
                <h4 style={{ color: "#333", marginBottom: "10px" }}>【方法1】PWAとしてインストール（推奨）</h4>
                <ol style={{ lineHeight: "1.8", color: "#555" }}>
                  <li><strong>Chromeプロファイルを作成</strong>
                    <ul style={{ marginTop: "8px" }}>
                      <li>Chromeを開き、右上のアイコンをクリック</li>
                      <li>「追加」→「プロファイルを追加」</li>
                      <li>自分の名前を入力（例: kanou）</li>
                    </ul>
                  </li>
                  <li style={{ marginTop: "12px" }}><strong>アプリをインストール</strong>
                    <ul style={{ marginTop: "8px" }}>
                      <li>自分のChromeプロファイルで、アプリのURL（{typeof window !== 'undefined' ? window.location.origin : 'デプロイURL'}）にアクセス</li>
                      <li>アドレスバー右側の「インストール」ボタン（⬇アイコン）をクリック</li>
                      <li>デスクトップにアプリアイコンが作成されます</li>
                    </ul>
                  </li>
                  <li style={{ marginTop: "12px" }}><strong>アイコン名を変更（任意）</strong>
                    <ul style={{ marginTop: "8px" }}>
                      <li>デスクトップのアイコンを右クリック → 名前変更</li>
                      <li>「MKGアプリ - 自分の名前」に変更すると分かりやすい</li>
                    </ul>
                  </li>
                </ol>

                <h4 style={{ color: "#333", marginBottom: "10px", marginTop: "20px" }}>【方法2】ブックマーク/ショートカット</h4>
                <ol style={{ lineHeight: "1.8", color: "#555" }}>
                  <li>自分のChromeプロファイルでアプリのURLにアクセス</li>
                  <li>ブックマークに追加、またはデスクトップにショートカット作成</li>
                  <li>以降はブックマーク/ショートカットから起動</li>
                </ol>
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                👥 複数人で使用する場合
              </h3>
              <ul style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                <li>各社員が自分専用のChromeプロファイルを作成</li>
                <li>各プロファイルから個別にPWAをインストール</li>
                <li>デスクトップには各自のアイコンが並ぶ（例: 「MKGアプリ - 叶俊輔」「MKGアプリ - kanou keiko」）</li>
                <li>自分のアイコンをクリックすると、自分専用の環境で起動</li>
                <li>ログイン状態、データは完全に分離される</li>
              </ul>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                🔐 初回ログイン
              </h3>
              <ol style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                <li>新規登録画面から「名前」「パスワード」「所属チーム」を入力</li>
                <li>名前は英字のみ（スペースも可）</li>
                <li>登録が完了すると自動的にログインされます</li>
                <li>次回からはログイン画面から名前とパスワードを入力</li>
              </ol>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                📱 主な機能
              </h3>
              <ul style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                <li><strong>Plan（計画）</strong>: 展開表の作成・改善目標の設定</li>
                <li><strong>Do（実行）</strong>: タスク管理・活動の推進</li>
                <li><strong>Check（確認）</strong>: 報告書作成・パトロールチェック</li>
                <li><strong>Act（改善）</strong>: AI相談による再展開・改善策の更新</li>
              </ul>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#667eea", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
                ❓ よくある質問
              </h3>
              <div style={{ lineHeight: "1.8", color: "#555", marginLeft: "20px" }}>
                <p><strong>Q: パスワードを忘れました</strong><br/>
                A: 管理者に連絡してパスワードをリセットしてもらってください。</p>

                <p><strong>Q: 他の人のデータが見えてしまいます</strong><br/>
                A: Chromeプロファイルが混在している可能性があります。正しい自分のプロファイルから起動してください。</p>

                <p><strong>Q: オフラインで使えますか？</strong><br/>
                A: PWAインストール後は、一部機能がオフラインで利用可能です（データベースへのアクセスはオンライン必須）。</p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "30px" }}>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold"
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スマホ用フッター固定ナビゲーション */}
      <div className="mobile-footer" style={{
        display: "none", // PCでは非表示
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        borderTop: "2px solid #e0e0e0",
        padding: "10px 15px",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        zIndex: 1000
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          {/* チーム情報 */}
          <div style={{ flex: 1, fontSize: "12px", color: "#666" }}>
            <div style={{ fontWeight: "600", color: "#333" }}>{selectedTeam?.name || 'チーム未選択'}</div>
            <div style={{ fontSize: "10px" }}>{currentUser?.email?.split('@')[0]}</div>
          </div>

          {/* ボタングループ */}
          <div style={{ display: "flex", gap: "8px" }}>
            {isKanoAdmin() && (
              <button
                onClick={() => setCurrentScreen('team-select')}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap"
                }}
              >
                ⚙️ 管理
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
