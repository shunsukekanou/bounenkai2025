'use client';

import { useState } from 'react';

export default function AnimationTest() {
  const [showAnimation, setShowAnimation] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-4xl font-bold mb-12 text-white">マーキーアニメーション確認</h1>

        {/* 大きな目立つボタン */}
        <button
          onClick={() => setShowAnimation(!showAnimation)}
          className="px-16 py-8 text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl mb-12"
        >
          {showAnimation ? '⏸ アニメーション停止' : '▶️ アニメーション開始'}
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">現在の動作</h2>
          <p className="text-xl mb-2">✅ 右から左へ流れる（修正後）</p>
          <p className="text-lg text-gray-600">
            画面右端から左端へメッセージが流れます
          </p>
        </div>

        {/* アニメーション表示エリア */}
        {showAnimation && (
          <div className="fixed bottom-1/2 left-0 w-full overflow-hidden z-50 pointer-events-none">
            <p
              className="animate-marquee whitespace-nowrap text-6xl font-black text-red-600"
              style={{ textShadow: '2px 2px 4px white' }}
            >
              🎉 BINGO達成！おめでとうございます！ 🎉
            </p>
          </div>
        )}

        {/* 参考情報 */}
        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-yellow-800 mb-3">📝 確認ポイント</h3>
          <ul className="text-lg text-yellow-700 space-y-2 text-left">
            <li>• メッセージが画面の右端から出現する</li>
            <li>• 左方向へ流れていく</li>
            <li>• 画面左端で消える</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
