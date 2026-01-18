'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';
import { generateUniqueBingoCards, checkBingo, checkReach, getReachSquares, BingoCardData, BingoSquare } from '../../lib/bingo';
import WinnerList from '../../components/winner-list';
import ReachList from '../../components/reach-list';
import MobileOnlyGuard from '../../components/mobile-only-guard';
import SlotMachine from '../../components/slot-machine';

// バージョン表示用（デプロイ確認用）
const APP_VERSION = 'v2.0-latest';

// --- UI Components (can be moved to separate files later) ---

const CardSquare = ({ square, isReachSquare, showAnimation }: { square: BingoSquare, isReachSquare?: boolean, showAnimation?: boolean }) => (
  <div
    className={`aspect-square flex items-center justify-center border text-center
    ${square.marked ? 'bg-yellow-300 text-gray-500 transform scale-90 rotate-6' : 'bg-white'}
    ${square.number === 'FREE' ? 'text-xs font-semibold' : 'text-lg font-bold'}
    ${isReachSquare && showAnimation ? 'reach-flash' : ''}
    transition-all duration-300`}
  >
    {square.number}
  </div>
);

const BingoCardDisplay = ({ cardData, reachSquares, showReachAnimation }: { cardData: BingoCardData, reachSquares?: Array<{row: number, col: number}>, showReachAnimation?: boolean }) => (
  <div className="max-w-xs mx-auto grid grid-cols-5 gap-1 bg-gray-300 p-1 rounded-lg shadow-inner">
    {['B', 'I', 'N', 'G', 'O'].map(letter => (
      <div key={letter} className="w-12 h-8 flex items-center justify-center text-base font-bold text-white bg-gray-600 rounded-t-md">{letter}</div>
    ))}
    {cardData.flat().map((square, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      const isReachSquare = reachSquares?.some(rs => rs.row === row && rs.col === col) || false;
      return <CardSquare key={index} square={square} isReachSquare={isReachSquare} showAnimation={showReachAnimation} />;
    })}
  </div>
);

// --- Main Page Component ---

interface AvailableGame {
  id: string;
  game_code: string;
  created_at: string;
  drawn_numbers: number[];
}

export default function ParticipantPage() {
  const supabase = createClient();
  const [step, setStep] = useState<'autoDetect' | 'selectGame' | 'enterCode' | 'enterName' | 'selectCard' | 'playing'>('autoDetect');
  const [error, setError] = useState('');

  // Game and Participant state
  const [gameCode, setGameCode] = useState('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const audioUnlocked = useRef(false); // 音声の自動再生ロック解除を追跡
  const audioContextRef = useRef<AudioContext | null>(null); // AudioContextを共有
  const [rouletteBuffer, setRouletteBuffer] = useState<AudioBuffer | null>(null);

  // ブラウザの音声自動再生ポリシーを回避するための関数
  const unlockAudio = () => {
    if (typeof window === 'undefined' || audioUnlocked.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        audioUnlocked.current = true;
      }).catch(e => console.error("AudioContext resume failed.", e));
    } else {
      audioUnlocked.current = true;
    }
  };

  // AudioContextの初期化と音声ファイルの読み込み
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("AudioContext is not supported.", e);
        return;
      }
    }
    
    const audioContext = audioContextRef.current;
    if (audioContext && !rouletteBuffer) {
      fetch('/sounds/roulette.wav')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          setRouletteBuffer(audioBuffer);
        })
        .catch(e => console.error("Error loading or decoding roulette sound:", e));
    }
  }, []);

  // URLパラメータからゲームコードを自動入力、または自動検出
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      // URLにコードがある場合は従来通り
      setGameCode(codeFromUrl.toUpperCase());
      setStep('enterCode');
    } else {
      // URLにコードがない場合は自動検出
      fetchAvailableGames();
    }
  }, []);

  // ブラウザの戻る操作を防ぐ（ゲーム中のみ）
  useEffect(() => {
    if (step !== 'playing') return;

    // 履歴に現在のページを追加（戻るを無効化するため）
    const preventNavigation = () => {
      window.history.pushState(null, '', window.location.href);
    };

    // ページロード時に履歴を追加
    preventNavigation();

    // popstateイベントで戻るを検知して無効化
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      preventNavigation();
      // 戻る操作があったら確認メッセージを表示
      setShowExitConfirm(true);
    };

    // beforeunloadイベントでページ離脱を検知
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step]);

  // アクティブなゲームを自動検出
  const fetchAvailableGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('id, game_code, created_at, drawn_numbers')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1); // 最新のゲーム1件のみを取得

    if (error) {
      console.error('Error fetching games:', error);
      setError('ゲームの取得に失敗しました');
      setStep('enterCode');
    } else if (data && data.length > 0) {
      setAvailableGames(data); // 常に1件のゲームが配列としてセットされる
      setStep('selectGame'); // ゲームが1つ見つかった場合は選択画面へ
    } else {
      // ゲームがない場合は手動入力へ
      setError('現在進行中のゲームがありません');
      setStep('enterCode');
    }
  };

  // Card and Bingo state
  const [cardsToSelect, setCardsToSelect] = useState<BingoCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<BingoCardData | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isBingo, setIsBingo] = useState(false);
  const [isReach, setIsReach] = useState(false);
  const [reachSquares, setReachSquares] = useState<Array<{row: number, col: number}>>([]);
  const [showReachAnimation, setShowReachAnimation] = useState(false);
  const [marqueeMessage, setMarqueeMessage] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Refs for scrolling
  const bingoCardRef = useRef<HTMLDivElement>(null);
  const winnerListRef = useRef<HTMLDivElement>(null);
  const reachListRef = useRef<HTMLDivElement>(null);

  // Slot machine state for real-time animation
  const [isSpinning, setIsSpinning] = useState(false);
  const [numberToDraw, setNumberToDraw] = useState<number | null>(null);
  const prevDrawnNumbersLength = useRef(0);

  // ビンゴ達成音を再生
  const playBingoSound = () => {
    if (typeof window === 'undefined' || !audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    try {
      // 歓声音を再生
      const cheerAudio = new Audio('/sounds/bingo-cheer.wav');
      cheerAudio.volume = 0.7;
      cheerAudio.play().catch(e => console.log('Cheer audio play failed:', e));

      // お祝いのメロディーを再生
      const melodyAudio = new Audio('/sounds/celebration-melody.wav');
      melodyAudio.volume = 0.6;
      melodyAudio.play().catch(e => console.log('Melody audio play failed:', e));

      // 勝利のトランペットを再生
      const trumpetAudio = new Audio('/sounds/victory-trumpet.wav');
      trumpetAudio.volume = 0.8;
      trumpetAudio.play().catch(e => console.log('Trumpet audio play failed:', e));

      // 口笛を再生
      const whistleAudio = new Audio('/sounds/whistle.wav');
      whistleAudio.volume = 0.6;
      whistleAudio.play().catch(e => console.log('Whistle audio play failed:', e));

      // ファンファーレ音を再生
      // const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // 華やかなビンゴ音（上昇音階）
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

        const startTime = audioContext.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.6);
      });
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // カード選択時のクリック音
  const playClickSound = () => {
    if (typeof window === 'undefined' || !audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    try {
      // const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // リーチ達成音を再生（4.1秒間の演出に合わせる）
  const playReachSound = () => {
    if (typeof window === 'undefined') return;
    try {
      // リーチ音源を再生
      const audio = new Audio('/リーチ.wav');
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Reach audio play failed:', e));

      // 4.1秒後に音を停止（演出時間に合わせる）
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 4100);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // --- Real-time and State Effects ---

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const newDrawnNumbers = payload.new.drawn_numbers || [];
          setDrawnNumbers(newDrawnNumbers);
          prevDrawnNumbersLength.current = newDrawnNumbers.length;
        })
      .on('broadcast', { event: 'start_spin' }, (payload) => {
        setNumberToDraw(payload.payload.newNumber);
        setIsSpinning(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, supabase]);

  useEffect(() => {
    if (!selectedCard) return;
    const updatedCard = selectedCard.map(row =>
      row.map(square => ({ ...square, marked: square.number === 'FREE' || drawnNumbers.includes(square.number as number) }))
    );
    setSelectedCard(updatedCard);

    // ビンゴチェック
    if (!isBingo && checkBingo(updatedCard)) {
      setIsBingo(true);
      playBingoSound();
      claimBingo();
    }
    // リーチチェック（ビンゴ前のみ）
    else if (!isBingo && !isReach && checkReach(updatedCard)) {
      setIsReach(true);
      setReachSquares(getReachSquares(updatedCard));
      setShowReachAnimation(true);
      playReachSound();
      claimReach(); // データベースにリーチ状態を保存

      // 4.1秒後にアニメーションを消す
      setTimeout(() => {
        setShowReachAnimation(false);
      }, 4100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnNumbers]);

  // Marquee handlers
  const handleNewWinner = (name: string) => {
    setMarqueeMessage(`${name}さん BINGO!!!`);
    setTimeout(() => setMarqueeMessage(''), 6000);
  };

  const handleNewReach = (name: string) => {
    setMarqueeMessage(`${name}さん リーチ!!!`);
    setTimeout(() => setMarqueeMessage(''), 6000);
  };

  // Scroll to winner list on bingo
  useEffect(() => {
    if (isBingo && winnerListRef.current) {
      winnerListRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        bingoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 8000);
    }
  }, [isBingo]);

  // Scroll to reach list on reach
  useEffect(() => {
    if (isReach && reachListRef.current) {
      reachListRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        bingoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 8000);
    }
  }, [isReach]);

  // --- Database Functions ---

  const handleJoinGame = async () => {
    unlockAudio(); // 音声再生許可を取得
    if (!gameCode.trim()) return setError('ゲームコードを入力してください。');
    setError('');
    const { data, error: fetchError } = await supabase.from('games').select('id, drawn_numbers').eq('game_code', gameCode.toUpperCase()).single();
    if (fetchError || !data) return setError('無効なゲームコードです。');
    setGameId(data.id);
    setDrawnNumbers(data.drawn_numbers || []);
    setStep('enterName');
  };

  const handleSelectGame = (game: AvailableGame) => {
    unlockAudio(); // 音声再生許可を取得
    setGameId(game.id);
    setGameCode(game.game_code);
    setDrawnNumbers(game.drawn_numbers || []);
    setStep('enterName');
  };

  const handleSetName = async () => {
    unlockAudio(); // 音声再生許可を取得
    if (!userName.trim()) return setError('名前を入力してください。');
    if (!gameId) return setError('ゲームIDが見つかりません。');
    setError('');

    // 同じゲームで同じ名前の参加者が既に存在するかチェック
    const { data: existingParticipant, error: checkError } = await supabase
      .from('participants')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_name', userName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = "No rows found" エラー以外はエラーとして扱う
      return setError('参加者確認に失敗しました。');
    }

    let participantData;

    if (existingParticipant) {
      // 既存の参加者が見つかった場合は再利用
      participantData = existingParticipant;
      console.log('既存の参加者として再参加:', userName);
    } else {
      // 新規参加者として登録
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({ game_id: gameId, user_name: userName })
        .select()
        .single();

      if (insertError || !newParticipant) {
        return setError('参加者登録に失敗しました。');
      }
      participantData = newParticipant;
      console.log('新規参加者として登録:', userName);
    }

    setParticipantId(participantData.id);

    // 既存参加者の場合、カードが既に選択されているかチェック
    if (participantData.bingo_card) {
      // 既にカードが選択されている場合は、そのカードでゲームを再開
      setSelectedCard(participantData.bingo_card);
      // drawnNumbersは既にhandleJoinGame/handleSelectGameで設定済みなのでリセット不要
      setStep('playing');
    } else {
      // カード未選択の場合は、カード選択画面へ
      setCardsToSelect(generateUniqueBingoCards(3));
      setStep('selectCard');
    }
  };

  const handleCardSelection = async (card: BingoCardData) => {
    unlockAudio();
    playClickSound();

    if (!participantId) {
      setError('参加者IDが見つかりません。');
      return;
    }

    // カードをデータベースに保存
    const { error: updateError } = await supabase
      .from('participants')
      .update({ bingo_card: card })
      .eq('id', participantId);

    if (updateError) {
      console.error('カード保存エラー:', updateError);
      setError('カードの保存に失敗しました。もう一度お試しください。');
      return;
    }

    // 保存成功後、ローカル状態を更新してゲーム画面へ
    setSelectedCard(card);
    setStep('playing');
  };

  const claimReach = async () => {
    if (!gameId || !participantId) return;
    await supabase.from('participants').update({ is_reach: true }).eq('id', participantId);
  };

  const claimBingo = async () => {
    if (!gameId || !participantId) return;
    const { data, error } = await supabase.from('participants').select('id').eq('game_id', gameId).not('bingo_rank', 'is', null);
    if (error) return console.error('Could not count winners', error);
    const rank = (data?.length || 0) + 1;
    await supabase.from('participants').update({ bingo_rank: rank }).eq('id', participantId);
  };

  // スロットマシンアニメーション終了時のコールバック
  const handleSlotAnimationEnd = () => {
    setIsSpinning(false);
  };

  // --- Render Logic ---

  const renderStep = () => {
    switch (step) {
      case 'autoDetect':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-xl font-bold">🔍 ゲームを検索中...</h1>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        );
      case 'selectGame':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center">🎮 ゲームに参加する</h1>
            {availableGames.length === 1 ? (
              <>
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg text-left">
                  <h2 className="font-bold text-sm text-gray-800 mb-2">✅ 進行中のゲームが見つかりました</h2>
                  <p className="text-xs text-gray-700">下のボタンを押すだけで参加できます</p>
                </div>
                <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ゲームコード:</p>
                  <p className="text-2xl font-bold text-blue-600 tracking-widest mb-2">{availableGames[0].game_code}</p>
                  <p className="text-xs text-gray-500">
                    作成日時: {new Date(availableGames[0].created_at).toLocaleString('ja-JP')}
                  </p>
                  <p className="text-xs text-gray-500">
                    抽選済み: {availableGames[0].drawn_numbers.length} / 75
                  </p>
                </div>
                <button
                  onClick={() => handleSelectGame(availableGames[0])}
                  className="w-full px-4 py-3 text-base font-semibold text-white bg-green-600 rounded-md active:bg-green-700"
                >
                  このゲームに参加
                </button>
                <button
                  onClick={() => setStep('enterCode')}
                  className="w-full px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-md active:bg-gray-200"
                >
                  別のゲームに参加（コード入力）
                </button>
              </>
            ) : (
              <>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg text-left">
                  <h2 className="font-bold text-sm text-gray-800 mb-2">🎯 複数のゲームが進行中です</h2>
                  <p className="text-xs text-gray-700">参加したいゲームを選択してください</p>
                </div>
                <div className="space-y-3">
                  {availableGames.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => handleSelectGame(game)}
                      className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg active:scale-95 transition-transform cursor-pointer"
                    >
                      <p className="text-lg font-bold text-blue-600 tracking-widest mb-1">{game.game_code}</p>
                      <p className="text-xs text-gray-600">作成: {new Date(game.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-gray-600">抽選済み: {game.drawn_numbers.length} / 75</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep('enterCode')}
                  className="w-full px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-md active:bg-gray-200"
                >
                  コードを手動入力
                </button>
              </>
            )}
          </div>
        );
      case 'enterCode':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center">🎮 ゲームに参加する</h1>
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg text-left">
              <h2 className="font-bold text-sm text-gray-800 mb-2">📝 参加方法</h2>
              <p className="text-xs text-gray-700 mb-1">1. 幹事から教えてもらった6文字のゲームコードを入力</p>
              <p className="text-xs text-gray-700">2. 「参加」ボタンを押してください</p>
            </div>
            <input type="text" value={gameCode} onChange={(e) => setGameCode(e.target.value.toUpperCase())} placeholder="ゲームコード（例：ABC123）" className="w-full px-4 py-2 text-center text-xl tracking-widest border rounded-md" maxLength={6} />
            <button onClick={handleJoinGame} className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md active:bg-blue-700">参加</button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        );
      case 'enterName':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center">✏️ あなたの名前を入力</h1>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg text-left">
              <p className="text-xs text-gray-700 mb-1">この名前はビンゴランキングに表示されます</p>
              <p className="text-xs text-gray-700">（本名でもニックネームでもOK）</p>
            </div>
            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="ランキング表示名（例：田中太郎）" className="w-full px-4 py-2 text-center text-base border rounded-md" />
            <button onClick={handleSetName} className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded-md active:bg-green-700">決定</button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        );
      case 'selectCard':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-xl font-bold">🎴 お好きなカードを1枚選んでください</h1>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg text-left">
              <p className="text-xs text-gray-700 mb-1">✨ 3枚の中から好きなカードをタップして選択</p>
              <p className="text-xs text-gray-700">💡 中央の「FREE」は最初からマークされています</p>
            </div>
            <div className="flex flex-col items-center gap-4 pt-2">
              {cardsToSelect.map((card, i) => (
                <div key={i} onClick={() => handleCardSelection(card)} className="active:scale-95 transition-transform duration-200 cursor-pointer">
                  <BingoCardDisplay cardData={card} />
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          </div>
        );
      case 'playing':
        if (!selectedCard) return <div>カードがありません。</div>;
        return (
          <div className="space-y-4 w-full relative">
            {/* 終了ボタン（右上固定） */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="fixed top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-110"
              aria-label="ゲーム終了"
            >
              <span className="text-xl font-bold leading-none">✕</span>
            </button>

            {/* 終了確認ダイアログ */}
            {showExitConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    ゲームを終了しますか？
                  </h2>
                  <p className="text-sm text-gray-600 mb-6 text-center">
                    終了すると、同じ名前で再参加できます
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowExitConfirm(false)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        // ページをリロードして初期画面に戻る
                        window.location.href = '/participant';
                      }}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                    >
                      終了する
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
              <p className="text-xs text-gray-700 text-left">
                ✅ 準備完了！幹事が番号を抽選すると、該当する数字が自動でマークされます。縦・横・斜めのいずれか1列が揃ったら自動的にビンゴです！
              </p>
            </div>

            <div ref={bingoCardRef} className="relative w-full p-4 space-y-4 bg-white rounded-lg shadow-md text-center">
              <h1 className="text-lg font-bold">{userName}さんのカード</h1>
              <BingoCardDisplay cardData={selectedCard} reachSquares={reachSquares} showReachAnimation={showReachAnimation} />
              {showReachAnimation && !isBingo && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg pointer-events-none">
                  <div className="text-center space-y-2 animate-bounce">
                    <div className="text-7xl font-black text-white reach-text-flash" style={{
                      textShadow: '0 0 30px #f97316, 0 0 50px #ea580c, 0 0 70px #dc2626',
                      WebkitTextStroke: '2px #dc2626'
                    }}>
                      REACH!
                    </div>
                    <div className="flex gap-2 justify-center items-center">
                      <span className="text-4xl">🔥</span>
                      <span className="text-2xl font-bold text-orange-400 bg-white px-3 py-1 rounded-full">あと1つ!</span>
                      <span className="text-4xl">🔥</span>
                    </div>
                  </div>
                </div>
              )}
              {isBingo && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20 rounded-lg">
                  <div className="text-6xl font-black text-white animate-bounce" style={{ textShadow: '0 0 20px #fef08a, 0 0 30px #fde047' }}>BINGO!</div>
                </div>
              )}
            </div>

            {/* スロットマシンアニメーション */}
            <div className="flex justify-center">
              <SlotMachine
                drawnNumber={numberToDraw}
                isSpinning={isSpinning}
                onAnimationEnd={handleSlotAnimationEnd}
                audioContext={audioContextRef.current}
                rouletteBuffer={rouletteBuffer}
              />
            </div>

            <div ref={winnerListRef}>
              <WinnerList gameId={gameId} onNewWinner={handleNewWinner} />
            </div>
            <div ref={reachListRef}>
              <ReachList gameId={gameId} onNewReach={handleNewReach} />
            </div>
          </div>
        );
      default:
        return <div>読み込み中...</div>;
    }
  };

  return (
    <MobileOnlyGuard>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        {renderStep()}
        {marqueeMessage && (
          <div className="fixed bottom-1/2 left-0 w-full overflow-hidden z-50 pointer-events-none">
            <p className="animate-marquee whitespace-nowrap text-6xl font-black text-red-600" style={{ textShadow: '2px 2px 4px white' }}>
              {marqueeMessage}
            </p>
          </div>
        )}
        <div className="fixed bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full opacity-70">
          {APP_VERSION}
        </div>
      </div>
    </MobileOnlyGuard>
  );
}