'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';
import { generateUniqueBingoCards, checkBingo, checkReach, getReachSquares, BingoCardData, BingoSquare } from '../../lib/bingo';
import WinnerList from '../../components/winner-list';
import ReachList from '../../components/reach-list';
import SlotMachine from '../../components/slot-machine';
import MobileOnlyGuard from '../../components/mobile-only-guard';
// import { QRCodeSVG } from 'qrcode.react'; // 一時的にコメントアウト（Vercelビルドエラー回避）

// バージョン表示用（デプロイ確認用）
const APP_VERSION = 'v2.0-latest';

// --- UI Components ---

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

// Define the Game type for TypeScript
export interface Game {
  id: string;
  created_at: string;
  game_code: string;
  status: 'pending' | 'active' | 'finished';
  drawn_numbers: number[];
}

export default function OrganizerPage() {
  const supabase = createClient();
  const [game, setGame] = useState<Game | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [channel, setChannel] = useState<any>(null);

  // State for animation
  const [isSpinning, setIsSpinning] = useState(false);
  const [numberToDraw, setNumberToDraw] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // 幹事の参加状態
  const [organizerStep, setOrganizerStep] = useState<'notJoined' | 'enterName' | 'selectCard' | 'playing'>('notJoined');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [cardsToSelect, setCardsToSelect] = useState<BingoCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<BingoCardData | null>(null);
  const [isBingo, setIsBingo] = useState(false);
  const [isReach, setIsReach] = useState(false);
  const [reachSquares, setReachSquares] = useState<Array<{row: number, col: number}>>([]);
  const [showReachAnimation, setShowReachAnimation] = useState(false);
  const [marqueeMessage, setMarqueeMessage] = useState('');

  // ゲストの参加状態
  const [guestStep, setGuestStep] = useState<'notJoined' | 'enterName' | 'selectCard' | 'playing'>('notJoined');
  const [guestName, setGuestName] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestCardsToSelect, setGuestCardsToSelect] = useState<BingoCardData[]>([]);
  const [guestSelectedCard, setGuestSelectedCard] = useState<BingoCardData | null>(null);
  const [guestIsBingo, setGuestIsBingo] = useState(false);
  const [guestIsReach, setGuestIsReach] = useState(false);
  const [guestReachSquares, setGuestReachSquares] = useState<Array<{row: number, col: number}>>([]);
  const [guestShowReachAnimation, setGuestShowReachAnimation] = useState(false);

  // Refs for scrolling
  const bingoCardRef = useRef<HTMLDivElement>(null);
  const winnerListRef = useRef<HTMLDivElement>(null);
  const reachListRef = useRef<HTMLDivElement>(null);

  // Audio state
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const audioUnlocked = React.useRef(false);
  const [rouletteBuffer, setRouletteBuffer] = React.useState<AudioBuffer | null>(null);

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

  // 音声再生関数
  const playBingoSound = () => {
    if (typeof window === 'undefined' || !audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    try {
      // 歓声音を再生
      fetch('/sounds/bingo-cheer.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.7;
          source.connect(gainNode).connect(audioContext.destination);
          source.start(0);
        })
        .catch(e => console.error('Cheer audio play failed:', e));

      // お祝いのメロディーを再生
      fetch('/sounds/celebration-melody.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.6;
          source.connect(gainNode).connect(audioContext.destination);
          source.start(0);
        })
        .catch(e => console.error('Melody audio play failed:', e));

      // 勝利のトランペットを再生
      fetch('/sounds/victory-trumpet.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.8;
          source.connect(gainNode).connect(audioContext.destination);
          source.start(0);
        })
        .catch(e => console.error('Trumpet audio play failed:', e));

      // 口笛を再生
      fetch('/sounds/whistle.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.6;
          source.connect(gainNode).connect(audioContext.destination);
          source.start(0);
        })
        .catch(e => console.error('Whistle audio play failed:', e));

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

  const playReachSound = () => {
    if (typeof window === 'undefined' || !audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    try {
      // リーチ音源を再生
      fetch('/リーチ.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.8;
          source.connect(gainNode).connect(audioContext.destination);
          source.start(0);
          // 4.1秒後に音を停止（演出時間に合わせる）
          source.stop(audioContext.currentTime + 4.1);
        })
        .catch(e => console.error('Reach audio play failed:', e));
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // ビンゴ/リーチ判定（幹事）
  useEffect(() => {
    if (!selectedCard) return;
    const updatedCard = selectedCard.map(row =>
      row.map(square => ({ ...square, marked: square.number === 'FREE' || drawnNumbers.includes(square.number as number) }))
    );
    setSelectedCard(updatedCard);

    if (!isBingo && checkBingo(updatedCard)) {
      setIsBingo(true);
      playBingoSound();
      claimBingo();
    } else if (!isBingo && !isReach && checkReach(updatedCard)) {
      setIsReach(true);
      setReachSquares(getReachSquares(updatedCard));
      setShowReachAnimation(true);
      playReachSound();
      claimReach();
      setTimeout(() => {
        setShowReachAnimation(false);
      }, 4100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnNumbers]);

  // ビンゴ/リーチ判定（ゲスト）
  useEffect(() => {
    if (!guestSelectedCard) return;
    const updatedCard = guestSelectedCard.map(row =>
      row.map(square => ({ ...square, marked: square.number === 'FREE' || drawnNumbers.includes(square.number as number) }))
    );
    setGuestSelectedCard(updatedCard);

    if (!guestIsBingo && checkBingo(updatedCard)) {
      setGuestIsBingo(true);
      playBingoSound();
      claimGuestBingo();
    } else if (!guestIsBingo && !guestIsReach && checkReach(updatedCard)) {
      setGuestIsReach(true);
      setGuestReachSquares(getReachSquares(updatedCard));
      setGuestShowReachAnimation(true);
      playReachSound();
      claimGuestReach();
      setTimeout(() => {
        setGuestShowReachAnimation(false);
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

  // リアルタイムで参加者数を取得
  useEffect(() => {
    if (!game) return;

    const fetchParticipantCount = async () => {
      let query = supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id);

      // 幹事とゲストをカウントから除外する
      const excludeIds = [];
      if (organizerId) excludeIds.push(organizerId);
      if (guestId) excludeIds.push(guestId);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching participant count:', error);
      } else {
        setParticipantCount(count || 0);
      }
    };

    // 初回取得
    fetchParticipantCount();

    // リアルタイム更新
    const channel = supabase
      .channel(`participants-count-${game.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `game_id=eq.${game.id}` },
        () => {
          fetchParticipantCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, supabase, organizerId, guestId]);



  const generateGameCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGame = async () => {
    unlockAudio(); // 最初のクリックで音声再生を有効化
    const gameCode = generateGameCode();
    const { data, error } = await supabase.from('games').insert({ game_code: gameCode, status: 'active', drawn_numbers: [] }).select().single();
    if (error) {
      console.error('Error creating game:', error);
      alert('エラーが発生しました: ' + error.message);
    } else {
      setGame(data);
      setDrawnNumbers(data.drawn_numbers || []);
      const newChannel = supabase.channel(`game-${data.id}`);
      newChannel.subscribe();
      setChannel(newChannel);
    }
  };

  const handleCopyUrl = async () => {
    if (!game) return;
    const participantUrl = `${window.location.origin}/participant?code=${game.game_code}`;
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('URLのコピーに失敗しました');
    }
  };

  // 幹事の参加登録
  const handleOrganizerJoin = () => {
    if (!organizerName.trim()) {
      alert('名前を入力してください');
      return;
    }
    setOrganizerStep('selectCard');
    setCardsToSelect(generateUniqueBingoCards(3));
  };

  const handleCardSelect = async (card: BingoCardData) => {
    if (!game) return;
    const { data, error } = await supabase.from('participants').insert({ game_id: game.id, user_name: organizerName }).select().single();
    if (error) {
      console.error('Error registering organizer:', error);
      alert('参加登録に失敗しました: ' + error.message);
    } else {
      setOrganizerId(data.id);
      setSelectedCard(card);
      setOrganizerStep('playing');
    }
  };

  const claimReach = async () => {
    if (!game || !organizerId) return;
    await supabase.from('participants').update({ is_reach: true }).eq('id', organizerId);
  };

  const claimBingo = async () => {
    if (!game || !organizerId) return;
    const { data, error } = await supabase.from('participants').select('id').eq('game_id', game.id).not('bingo_rank', 'is', null);
    if (error) return console.error('Could not count winners', error);
    const rank = (data?.length || 0) + 1;
    await supabase.from('participants').update({ bingo_rank: rank }).eq('id', organizerId);
  };

  // ゲストの参加登録
  const handleGuestJoin = () => {
    if (!guestName.trim()) {
      alert('ゲストの名前を入力してください');
      return;
    }
    setGuestStep('selectCard');
    setGuestCardsToSelect(generateUniqueBingoCards(3));
  };

  const handleGuestCardSelect = async (card: BingoCardData) => {
    if (!game) return;
    const { data, error } = await supabase.from('participants').insert({ game_id: game.id, user_name: guestName }).select().single();
    if (error) {
      console.error('Error registering guest:', error);
      alert('ゲスト登録に失敗しました: ' + error.message);
    } else {
      setGuestId(data.id);
      setGuestSelectedCard(card);
      setGuestStep('playing');
    }
  };

  const claimGuestReach = async () => {
    if (!game || !guestId) return;
    await supabase.from('participants').update({ is_reach: true }).eq('id', guestId);
  };

  const claimGuestBingo = async () => {
    if (!game || !guestId) return;
    const { data, error } = await supabase.from('participants').select('id').eq('game_id', game.id).not('bingo_rank', 'is', null);
    if (error) return console.error('Could not count winners', error);
    const rank = (data?.length || 0) + 1;
    await supabase.from('participants').update({ bingo_rank: rank }).eq('id', guestId);
  };

  const handleDrawNumber = () => {
    if (!game || isSpinning || !channel) return;

    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(num => !drawnNumbers.includes(num));
    if (availableNumbers.length === 0) {
      alert('全ての数字が抽選されました！');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];

    // 先に参加者にブロードキャスト
    channel.send({
      type: 'broadcast',
      event: 'start_spin',
      payload: { newNumber },
    });

    // 管理者自身のアニメーションを少し遅らせて開始し、同期を改善
    setTimeout(() => {
      setNumberToDraw(newNumber);
      setIsSpinning(true);
    }, 300); // 300msの遅延
  };

  // Step 2: Saves the number after animation ends
  const saveDrawnNumber = async () => {
    if (!game || numberToDraw === null) return;

    const updatedDrawnNumbers = [...drawnNumbers, numberToDraw].sort((a, b) => a - b);
    const { data, error } = await supabase.from('games').update({ drawn_numbers: updatedDrawnNumbers }).eq('id', game.id).select().single();

    if (error) {
      console.error('Error drawing number:', error);
      alert('エラーが発生しました: ' + error.message);
    } else {
      setGame(data);
      setDrawnNumbers(data.drawn_numbers || []);
    }
    // Reset animation state
    setIsSpinning(false);
  };

  return (
    <MobileOnlyGuard>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full p-6 space-y-5 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-800">👔 ビンゴゲーム管理画面</h1>

          {!game ? (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                <h2 className="font-bold text-base text-gray-800 mb-2">📝 幹事の方へ</h2>
                <p className="text-xs text-gray-700 mb-1">下のボタンを押すと、6文字のゲームコードが発行されます。</p>
                <p className="text-xs text-gray-700 font-semibold">このコードを参加者全員に共有してください（LINEグループなどで）</p>
              </div>
              <button onClick={handleCreateGame} className="w-full px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-md active:bg-blue-700">
                新しいゲームを作成する
              </button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
                <h2 className="font-bold text-base text-gray-800 mb-2">✅ ゲームコード発行完了</h2>
                <p className="text-xs text-gray-700 mb-1">1. ゲームコードを参加者全員に共有してください</p>
                <p className="text-xs text-gray-700 mb-1">2. 幹事もビンゴに参加できます！下で名前入力→カード選択</p>
                <p className="text-xs text-gray-700">3. 参加者が揃ったら、「次の数字を抽選する」ボタンを押してゲーム開始</p>
              </div>
              <div className="space-y-4 text-center">
                {/* QRコードとURL共有 */}
                <div className="bg-white border-2 border-green-500 p-4 rounded-lg">
                  <h3 className="font-bold text-base text-gray-800 mb-3">📱 参加者の招待方法（2つの方法）</h3>

                  {/* 方法1: QRコード - 一時的にコメントアウト（Vercelビルドエラー回避） */}
                  {/* <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">方法1: QRコードをスキャン</p>
                    <div className="flex justify-center bg-white p-3 rounded-lg">
                      <QRCodeSVG
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/participant?code=${game.game_code}`}
                        size={200}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">参加者がスマホカメラでスキャン→自動で参加画面へ</p>
                  </div> */}

                  {/* 方法2: URLリンク */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">方法2: URLをLINEなどで共有</p>
                    <button
                      onClick={handleCopyUrl}
                      className={`w-full px-4 py-3 text-sm font-semibold rounded-md transition-colors ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white active:bg-blue-600'
                      }`}
                    >
                      {copied ? '✓ コピーしました！' : '📋 参加URLをコピー'}
                    </button>
                    <p className="text-xs text-gray-600 mt-2">コピーしたURLをLINEグループなどに貼り付け</p>
                  </div>

                  {/* 従来のゲームコード表示（念のため残す） */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">手動入力用ゲームコード:</p>
                    <p className="text-xl font-bold text-gray-600 tracking-widest">
                      {game.game_code}
                    </p>
                  </div>
                </div>

                {/* 参加者人数表示 */}
                <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">現在の参加者数:</p>
                  <p className="text-2xl font-bold text-blue-600 tracking-widest mb-2">
                    {participantCount + (organizerId ? 1 : 0) + (guestId ? 1 : 0)}名
                  </p>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {organizerId && <p>• 幹事: 1名</p>}
                    {guestId && <p>• ゲスト: 1名</p>}
                    {participantCount > 0 && <p>• その他参加者: {participantCount}名</p>}
                  </div>
                  {(participantCount + (organizerId ? 1 : 0) + (guestId ? 1 : 0) < 2) && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ 2名以上で抽選を開始できます
                    </p>
                  )}
                </div>

                {/* 幹事の参加UI */}
                {organizerStep === 'notJoined' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                    <h3 className="font-bold text-sm text-gray-800 mb-2">🎯 幹事もビンゴに参加しませんか？</h3>
                    <input
                      type="text"
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      placeholder="あなたの名前（例：田中太郎）"
                      className="w-full px-3 py-2 mb-2 text-sm border rounded-md"
                    />
                    <button
                      onClick={handleOrganizerJoin}
                      className="w-full px-3 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-md active:bg-yellow-700"
                    >
                      ビンゴに参加する
                    </button>
                  </div>
                )}

                {organizerStep === 'selectCard' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                    <h3 className="font-bold text-sm text-gray-800 mb-3">🎴 【幹事】お好きなカードを1枚選んでください</h3>
                    <div className="flex flex-col items-center gap-3">
                      {cardsToSelect.map((card, i) => (
                        <div
                          key={i}
                          onClick={() => handleCardSelect(card)}
                          className="active:scale-95 transition-transform duration-200 cursor-pointer"
                        >
                          <BingoCardDisplay cardData={card} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ゲストの参加UI */}
                {guestStep === 'notJoined' && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
                    <h3 className="font-bold text-sm text-gray-800 mb-2">👤 ゲスト参加（スマホがない方用・1名のみ）</h3>
                    <p className="text-xs text-gray-600 mb-2">スマホをお持ちでない方を1名まで幹事画面で参加登録できます</p>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="ゲストの名前（例：山田花子）"
                      className="w-full px-3 py-2 mb-2 text-sm border rounded-md"
                    />
                    <button
                      onClick={handleGuestJoin}
                      className="w-full px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md active:bg-green-700"
                    >
                      ゲストを参加させる
                    </button>
                  </div>
                )}

                {guestStep === 'selectCard' && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
                    <h3 className="font-bold text-sm text-gray-800 mb-3">🎴 【ゲスト】お好きなカードを1枚選んでください</h3>
                    <div className="flex flex-col items-center gap-3">
                      {guestCardsToSelect.map((card, i) => (
                        <div
                          key={i}
                          onClick={() => handleGuestCardSelect(card)}
                          className="active:scale-95 transition-transform duration-200 cursor-pointer"
                        >
                          <BingoCardDisplay cardData={card} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 幹事とゲストのカード表示（横並び） */}
                {(organizerStep === 'playing' && selectedCard) || (guestStep === 'playing' && guestSelectedCard) ? (
                  <div ref={bingoCardRef} className="space-y-3">
                    {/* 幹事のカード */}
                    {organizerStep === 'playing' && selectedCard && (
                      <div className="relative bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                        <h3 className="font-bold text-sm text-gray-800 mb-2">🎯 【幹事】{organizerName}さんのカード</h3>
                        <div className="flex justify-center">
                          <BingoCardDisplay cardData={selectedCard} reachSquares={reachSquares} showReachAnimation={showReachAnimation} />
                        </div>
                        {showReachAnimation && !isBingo && (
                          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg pointer-events-none">
                            <div className="text-center">
                              <div className="text-5xl font-black text-white reach-text-flash" style={{
                                textShadow: '0 0 30px #f97316, 0 0 50px #ea580c, 0 0 70px #dc2626',
                                WebkitTextStroke: '2px #dc2626'
                              }}>
                                REACH!
                              </div>
                            </div>
                          </div>
                        )}
                        {isBingo && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20 rounded-lg">
                            <div className="text-5xl font-black text-white animate-bounce" style={{ textShadow: '0 0 20px #fef08a, 0 0 30px #fde047' }}>BINGO!</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ゲストのカード */}
                    {guestStep === 'playing' && guestSelectedCard && (
                      <div className="relative bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
                        <h3 className="font-bold text-sm text-gray-800 mb-2">👤 【ゲスト】{guestName}さんのカード</h3>
                        <div className="flex justify-center">
                          <BingoCardDisplay cardData={guestSelectedCard} reachSquares={guestReachSquares} showReachAnimation={guestShowReachAnimation} />
                        </div>
                        {guestShowReachAnimation && !guestIsBingo && (
                          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg pointer-events-none">
                            <div className="text-center">
                              <div className="text-5xl font-black text-white reach-text-flash" style={{
                                textShadow: '0 0 30px #f97316, 0 0 50px #ea580c, 0 0 70px #dc2626',
                                WebkitTextStroke: '2px #dc2626'
                              }}>
                                REACH!
                              </div>
                            </div>
                          </div>
                        )}
                        {guestIsBingo && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20 rounded-lg">
                            <div className="text-5xl font-black text-white animate-bounce" style={{ textShadow: '0 0 20px #fef08a, 0 0 30px #fde047' }}>BINGO!</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                <button
                  onClick={handleDrawNumber}
                  disabled={isSpinning || (participantCount + (organizerId ? 1 : 0) + (guestId ? 1 : 0) < 2)}
                  className="w-full px-4 py-3 text-base font-semibold text-white bg-green-600 rounded-md active:bg-green-700 disabled:bg-gray-400"
                >
                  {isSpinning ? '抽選中...' : (participantCount + (organizerId ? 1 : 0) + (guestId ? 1 : 0) < 2) ? '参加者を待っています...' : '次の数字を抽選する'}
                </button>

                <div className="flex justify-center">
                  <SlotMachine
                    drawnNumber={numberToDraw}
                    isSpinning={isSpinning}
                    onAnimationEnd={saveDrawnNumber}
                    audioContext={audioContextRef.current}
                    rouletteBuffer={rouletteBuffer}
                  />
                </div>

                {game && (
                  <>
                    <div ref={winnerListRef}>
                      <WinnerList gameId={game.id} onNewWinner={handleNewWinner} />
                    </div>
                    <div ref={reachListRef}>
                      <ReachList gameId={game.id} onNewReach={handleNewReach} />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

        </div>
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