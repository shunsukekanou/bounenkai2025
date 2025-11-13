'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { generateUniqueBingoCards, checkBingo, checkReach, BingoCardData, BingoSquare } from '../../lib/bingo';
import WinnerList from '../../components/winner-list';
import MobileOnlyGuard from '../../components/mobile-only-guard';

// --- UI Components (can be moved to separate files later) ---

const CardSquare = ({ square }: { square: BingoSquare }) => (
  <div
    className={`w-12 h-12 flex items-center justify-center border text-center
    ${square.marked ? 'bg-yellow-300 text-gray-500 transform scale-90 rotate-6' : 'bg-white'}
    ${square.number === 'FREE' ? 'text-xs font-semibold' : 'text-lg font-bold'}
    transition-all duration-300`}
  >
    {square.number}
  </div>
);

const BingoCardDisplay = ({ cardData }: { cardData: BingoCardData }) => (
  <div className="grid grid-cols-5 gap-1 bg-gray-300 p-1 rounded-lg shadow-inner">
    {['B', 'I', 'N', 'G', 'O'].map(letter => (
      <div key={letter} className="w-12 h-8 flex items-center justify-center text-base font-bold text-white bg-gray-600 rounded-t-md">{letter}</div>
    ))}
    {cardData.flat().map((square, index) => (
      <CardSquare key={index} square={square} />
    ))}
  </div>
);

// --- Main Page Component ---

export default function ParticipantPage() {
  const supabase = createClient();
  const [step, setStep] = useState<'enterCode' | 'enterName' | 'selectCard' | 'playing'>('enterCode');
  const [error, setError] = useState('');

  // Game and Participant state
  const [gameCode, setGameCode] = useState('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);

  // URLパラメータからゲームコードを自動入力
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      setGameCode(codeFromUrl.toUpperCase());
    }
  }, []);

  // Card and Bingo state
  const [cardsToSelect, setCardsToSelect] = useState<BingoCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<BingoCardData | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isBingo, setIsBingo] = useState(false);
  const [isReach, setIsReach] = useState(false);

  // ビンゴ達成音を再生
  const playBingoSound = () => {
    if (typeof window === 'undefined') return;
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

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
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // リーチ達成音を再生
  const playReachSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // 緊張感のあるリーチ音（急上昇する音）
      const notes = [440, 554.37, 659.25, 783.99]; // A4, C#5, E5, G5

      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'triangle'; // 柔らかい音
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

        const startTime = audioContext.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // --- Real-time and State Effects ---

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => setDrawnNumbers(payload.new.drawn_numbers || []))
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
      playReachSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnNumbers]);

  // --- Database Functions ---

  const handleJoinGame = async () => {
    if (!gameCode.trim()) return setError('ゲームコードを入力してください。');
    setError('');
    const { data, error: fetchError } = await supabase.from('games').select('id, drawn_numbers').eq('game_code', gameCode.toUpperCase()).single();
    if (fetchError || !data) return setError('無効なゲームコードです。');
    setGameId(data.id);
    setDrawnNumbers(data.drawn_numbers || []);
    setStep('enterName');
  };

  const handleSetName = async () => {
    if (!userName.trim()) return setError('名前を入力してください。');
    if (!gameId) return setError('ゲームIDが見つかりません。');
    setError('');
    const { data, error: insertError } = await supabase.from('participants').insert({ game_id: gameId, user_name: userName }).select().single();
    if (insertError || !data) return setError('参加者登録に失敗しました。');
    setParticipantId(data.id);
    setCardsToSelect(generateUniqueBingoCards(3));
    setStep('selectCard');
  };

  const claimBingo = async () => {
    if (!gameId || !participantId) return;
    const { data, error } = await supabase.from('participants').select('id').eq('game_id', gameId).not('bingo_rank', 'is', null);
    if (error) return console.error('Could not count winners', error);
    const rank = (data?.length || 0) + 1;
    await supabase.from('participants').update({ bingo_rank: rank }).eq('id', participantId);
  };

  // --- Render Logic ---

  const renderStep = () => {
    switch (step) {
      case 'enterCode':
        return (
          <div className="w-full p-6 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center">🎮 ゲームに参加する</h1>
            {gameCode ? (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-lg text-left">
                <p className="text-xs text-orange-700">🧪 開発テストモード：ゲームコードが自動入力されています</p>
              </div>
            ) : (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg text-left">
                <h2 className="font-bold text-sm text-gray-800 mb-2">📝 参加方法</h2>
                <p className="text-xs text-gray-700 mb-1">1. 幹事から教えてもらった6文字のゲームコードを入力</p>
                <p className="text-xs text-gray-700">2. 「参加」ボタンを押してください</p>
              </div>
            )}
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
                <div key={i} onClick={() => { playClickSound(); setSelectedCard(card); setStep('playing'); }} className="active:scale-95 transition-transform duration-200">
                  <BingoCardDisplay cardData={card} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'playing':
        if (!selectedCard) return <div>カードがありません。</div>;
        return (
          <div className="space-y-4 w-full">
            <div className="w-full bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
              <p className="text-xs text-gray-700 text-left">
                ✅ 準備完了！幹事が番号を抽選すると、該当する数字が自動でマークされます。縦・横・斜めのいずれか1列が揃ったら自動的にビンゴです！
              </p>
            </div>

            {/* 開発用テストボタン */}
            <div className="w-full bg-orange-50 border border-orange-300 p-3 rounded-lg">
              <p className="text-xs text-orange-700 mb-2">🧪 開発用テスト</p>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => {
                    setIsReach(true);
                    playReachSound();
                  }}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-orange-700 bg-orange-100 border border-orange-300 rounded-md active:bg-orange-200"
                >
                  リーチ演出を視聴
                </button>
                <button
                  onClick={() => {
                    setIsBingo(true);
                    playBingoSound();
                  }}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-green-700 bg-green-100 border border-green-300 rounded-md active:bg-green-200"
                >
                  ビンゴ演出を視聴
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const audio = new Audio('/sounds/victory-trumpet.wav');
                    audio.volume = 0.8;
                    audio.play().catch(e => console.log('Play failed:', e));
                  }}
                  className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-md active:bg-blue-200"
                >
                  トランペット
                </button>
                <button
                  onClick={() => {
                    const audio = new Audio('/sounds/celebration-melody.wav');
                    audio.volume = 0.6;
                    audio.play().catch(e => console.log('Play failed:', e));
                  }}
                  className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-md active:bg-blue-200"
                >
                  メロディー
                </button>
                <button
                  onClick={() => {
                    const audio = new Audio('/sounds/bingo-cheer.wav');
                    audio.volume = 0.7;
                    audio.play().catch(e => console.log('Play failed:', e));
                  }}
                  className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-md active:bg-blue-200"
                >
                  歓声
                </button>
                <button
                  onClick={() => {
                    const audio = new Audio('/sounds/whistle.wav');
                    audio.volume = 0.6;
                    audio.play().catch(e => console.log('Play failed:', e));
                  }}
                  className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-md active:bg-blue-200"
                >
                  口笛
                </button>
              </div>
              <p className="text-xs text-orange-600 mt-1">※本番時は削除予定</p>
            </div>
            <div className="relative w-full p-4 space-y-4 bg-white rounded-lg shadow-md text-center">
              <h1 className="text-lg font-bold">{userName}さんのカード</h1>
              <BingoCardDisplay cardData={selectedCard} />
              <div className="pt-3 text-center">
                <h2 className="text-base font-semibold">抽選済み</h2>
                <p className="text-2xl font-bold">{drawnNumbers.length} / 75</p>
              </div>
              {isReach && !isBingo && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse font-bold text-sm">
                    🔥 REACH!
                  </div>
                </div>
              )}
              {isBingo && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10 rounded-lg">
                  <div className="text-6xl font-black text-white animate-bounce" style={{ textShadow: '0 0 20px #fef08a, 0 0 30px #fde047' }}>BINGO!</div>
                </div>
              )}
            </div>
            <WinnerList gameId={gameId} />
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
      </div>
    </MobileOnlyGuard>
  );
}