'use client';

import React, { useState, useEffect } from 'react';
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
    className={`w-12 h-12 flex items-center justify-center border text-center
    ${square.marked ? 'bg-yellow-300 text-gray-500 transform scale-90 rotate-6' : 'bg-white'}
    ${square.number === 'FREE' ? 'text-xs font-semibold' : 'text-lg font-bold'}
    ${isReachSquare && showAnimation ? 'reach-flash' : ''}
    transition-all duration-300`}
  >
    {square.number}
  </div>
);

const BingoCardDisplay = ({ cardData, reachSquares, showReachAnimation }: { cardData: BingoCardData, reachSquares?: Array<{row: number, col: number}>, showReachAnimation?: boolean }) => (
  <div className="grid grid-cols-5 gap-1 bg-gray-300 p-1 rounded-lg shadow-inner">
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



  // 音声再生関数
  const playBingoSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const cheerAudio = new Audio('/sounds/bingo-cheer.wav');
      cheerAudio.volume = 0.7;
      cheerAudio.play().catch(e => console.log('Cheer audio play failed:', e));
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const playReachSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const audio = new Audio('/リーチ.wav');
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Reach audio play failed:', e));
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 4100);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // ビンゴ/リーチ判定
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

  // リアルタイムで参加者数を取得
  useEffect(() => {
    if (!game) return;

    const fetchParticipantCount = async () => {
      const { count, error } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id);

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
  }, [game, supabase]);



  const generateGameCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGame = async () => {
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
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">👥</span>
                    <span className="text-lg font-bold text-gray-800">
                      参加者数: {participantCount}名
                    </span>
                  </div>
                  {participantCount < 2 && (
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
                    <h3 className="font-bold text-sm text-gray-800 mb-3">🎴 お好きなカードを1枚選んでください</h3>
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

                {organizerStep === 'playing' && selectedCard && (
                  <div className="relative bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                    <h3 className="font-bold text-sm text-gray-800 mb-2">🎯 {organizerName}さんのカード</h3>
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

                <button
                  onClick={handleDrawNumber}
                  disabled={isSpinning || participantCount < 2}
                  className="w-full px-4 py-3 text-base font-semibold text-white bg-green-600 rounded-md active:bg-green-700 disabled:bg-gray-400"
                >
                  {isSpinning ? '抽選中...' : participantCount < 2 ? '参加者を待っています...' : '次の数字を抽選する'}
                </button>

                <div className="flex justify-center">
                  <SlotMachine drawnNumber={numberToDraw} isSpinning={isSpinning} onAnimationEnd={saveDrawnNumber} />
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <h2 className="text-base font-semibold text-center text-gray-700 mb-2">抽選済み数字 ({drawnNumbers.length} / 75)</h2>
            <div className="flex flex-wrap justify-center gap-2 p-3 bg-gray-50 rounded-md border min-h-[50px]">
              {drawnNumbers.length === 0 ? (
                <p className="text-xs text-gray-500">まだ数字は抽選されていません</p>
              ) : (
                drawnNumbers.map((num) => (
                  <span key={num} className="flex items-center justify-center w-10 h-10 text-base font-bold text-gray-800 bg-white border rounded-full shadow">
                    {num}
                  </span>
                ))
              )}
            </div>
          </div>

          {game && (
            <>
              <ReachList gameId={game.id} />
              <WinnerList gameId={game.id} />
            </>
          )}
        </div>
        <div className="fixed bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full opacity-70">
          {APP_VERSION}
        </div>
      </div>
    </MobileOnlyGuard>
  );
}