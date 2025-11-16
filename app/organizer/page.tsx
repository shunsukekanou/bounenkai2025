'use client';

import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import WinnerList from '../../components/winner-list';
import ReachList from '../../components/reach-list';
import SlotMachine from '../../components/slot-machine';
import MobileOnlyGuard from '../../components/mobile-only-guard';

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
  
  // State for animation
  const [isSpinning, setIsSpinning] = useState(false);
  const [numberToDraw, setNumberToDraw] = useState<number | null>(null);

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
    }
  };

  // Step 1: Starts the animation
  const handleDrawNumber = () => {
    if (!game || isSpinning) return;

    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(num => !drawnNumbers.includes(num));
    if (availableNumbers.length === 0) {
      alert('全ての数字が抽選されました！');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    setNumberToDraw(newNumber);
    setIsSpinning(true);
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
    setNumberToDraw(null);
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
                <p className="text-xs text-gray-700 mb-1">1. 下のゲームコードを参加者全員に共有してください</p>
                <p className="text-xs text-gray-700 mb-1">2. 参加者全員がカードを選んだら、「次の数字を抽選する」ボタンを押してゲーム開始</p>
                <p className="text-xs text-gray-700">3. スロットマシンで番号が発表されます（約4秒）</p>
              </div>
              <div className="space-y-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 mb-2">ゲームコード (参加者に共有):</p>
                  <p className="text-3xl font-bold text-green-600 tracking-widest bg-gray-200 p-3 rounded-md">
                    {game.game_code}
                  </p>
                </div>

                {/* 開発用テストボタン */}
                <div className="bg-orange-50 border border-orange-300 p-3 rounded-md">
                  <p className="text-xs text-orange-700 mb-2">🧪 開発用テスト</p>
                  <a
                    href={`/participant?code=${game.game_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-3 py-2 text-sm font-semibold text-orange-700 bg-orange-100 border border-orange-300 rounded-md active:bg-orange-200"
                  >
                    参加者画面を別タブで開く
                  </a>
                  <p className="text-xs text-orange-600 mt-1">※本番時は削除予定</p>
                </div>

                <button onClick={handleDrawNumber} disabled={isSpinning} className="w-full px-4 py-3 text-base font-semibold text-white bg-green-600 rounded-md active:bg-green-700 disabled:bg-gray-400">
                  {isSpinning ? '抽選中...' : '次の数字を抽選する'}
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
      </div>
    </MobileOnlyGuard>
  );
}