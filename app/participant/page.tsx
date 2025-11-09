'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { generateUniqueBingoCards, checkBingo, BingoCardData, BingoSquare } from '../../lib/bingo';
import WinnerList from '../../components/winner-list';

// --- UI Components (can be moved to separate files later) ---

const CardSquare = ({ square }: { square: BingoSquare }) => (
  <div
    className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border text-center
    ${square.marked ? 'bg-yellow-300 text-gray-500 transform scale-90 rotate-6' : 'bg-white'}
    ${square.number === 'FREE' ? 'text-xs font-semibold' : 'text-xl md:text-2xl font-bold'}
    transition-all duration-300`}
  >
    {square.number}
  </div>
);

const BingoCardDisplay = ({ cardData }: { cardData: BingoCardData }) => (
  <div className="grid grid-cols-5 gap-1 bg-gray-300 p-1 md:p-2 rounded-lg shadow-inner">
    {['B', 'I', 'N', 'G', 'O'].map(letter => (
      <div key={letter} className="w-12 h-8 md:w-16 md:h-10 flex items-center justify-center text-xl font-bold text-white bg-gray-600 rounded-t-md">{letter}</div>
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

  // Card and Bingo state
  const [cardsToSelect, setCardsToSelect] = useState<BingoCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<BingoCardData | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isBingo, setIsBingo] = useState(false);

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
    if (!isBingo && checkBingo(updatedCard)) {
      setIsBingo(true);
      claimBingo();
    }
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
          <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-center">🎮 ゲームに参加する</h1>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-left">
              <h2 className="font-bold text-sm text-gray-800 mb-2">📝 参加方法</h2>
              <p className="text-xs text-gray-700 mb-1">1. 幹事から教えてもらった6文字のゲームコードを入力</p>
              <p className="text-xs text-gray-700">2. 「参加」ボタンを押してください</p>
            </div>
            <input type="text" value={gameCode} onChange={(e) => setGameCode(e.target.value.toUpperCase())} placeholder="ゲームコード（例：ABC123）" className="w-full px-4 py-2 text-center text-2xl tracking-widest border rounded-md" maxLength={6} />
            <button onClick={handleJoinGame} className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">参加</button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        );
      case 'enterName':
        return (
          <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-center">✏️ あなたの名前を入力</h1>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg text-left">
              <p className="text-xs text-gray-700 mb-1">この名前はビンゴランキングに表示されます</p>
              <p className="text-xs text-gray-700">（本名でもニックネームでもOK）</p>
            </div>
            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="ランキング表示名（例：田中太郎）" className="w-full px-4 py-2 text-center text-lg border rounded-md" />
            <button onClick={handleSetName} className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">決定</button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        );
      case 'selectCard':
        return (
          <div className="w-full max-w-5xl p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-3xl font-bold">🎴 お好きなカードを1枚選んでください</h1>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg text-left max-w-2xl mx-auto">
              <p className="text-sm text-gray-700 mb-1">✨ 3枚の中から好きなカードをタップして選択</p>
              <p className="text-sm text-gray-700">💡 中央の「FREE」は最初からマークされています</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-4">
              {cardsToSelect.map((card, i) => (
                <div key={i} onClick={() => { setSelectedCard(card); setStep('playing'); }} className="cursor-pointer hover:scale-105 hover:shadow-2xl transition-transform duration-300">
                  <BingoCardDisplay cardData={card} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'playing':
        if (!selectedCard) return <div>カードがありません。</div>;
        return (
          <div className="space-y-4">
            <div className="w-full max-w-md bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
              <p className="text-xs text-gray-700 text-left">
                ✅ 準備完了！幹事が番号を抽選すると、該当する数字が自動でマークされます。縦・横・斜めのいずれか1列が揃ったら自動的にビンゴです！
              </p>
            </div>
            <div className="relative w-full max-w-md p-4 md:p-6 space-y-4 bg-white rounded-lg shadow-md text-center">
              <h1 className="text-2xl font-bold">{userName}さんのカード</h1>
              <BingoCardDisplay cardData={selectedCard} />
              <div className="pt-4 text-center">
                <h2 className="text-lg font-semibold">抽選済み</h2>
                <p className="text-3xl font-bold">{drawnNumbers.length} / 75</p>
              </div>
              {isBingo && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10 rounded-lg">
                  <div className="text-8xl md:text-9xl font-black text-white animate-bounce" style={{ textShadow: '0 0 20px #fef08a, 0 0 30px #fde047' }}>BINGO!</div>
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {renderStep()}
    </div>
  );
}