'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SlotMachineProps {
  drawnNumber: number | null;
  isSpinning: boolean;
  onAnimationEnd: () => void;
}

export default function SlotMachine({ drawnNumber, isSpinning, onAnimationEnd }: SlotMachineProps) {
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50); // ms
  const animationFrameId = useRef<number | null>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpinning && drawnNumber !== null) {
      // 初期化：激しい高速回転（5秒間）
      setAnimationSpeed(20);
      const spinStartTime = Date.now();

      const fastSpin = () => {
        const elapsed = Date.now() - spinStartTime;

        if (elapsed < 5000) {
          // 激しい高速回転
          setDisplayNumbers(Array.from({ length: 5 }, () => Math.floor(Math.random() * 75) + 1));
          setRotation(prev => (prev + 72) % 360); // 激しく回転
          timeoutId.current = setTimeout(fastSpin, 20);
        } else if (elapsed < 7000) {
          // 中速回転（2秒間）
          setDisplayNumbers(Array.from({ length: 5 }, () => Math.floor(Math.random() * 75) + 1));
          setRotation(prev => (prev + 36) % 360);
          timeoutId.current = setTimeout(fastSpin, 100);
        } else if (elapsed < 9000) {
          // 減速回転（2秒間）
          setDisplayNumbers(Array.from({ length: 5 }, () => Math.floor(Math.random() * 75) + 1));
          setRotation(prev => (prev + 18) % 360);
          timeoutId.current = setTimeout(fastSpin, 300);
        } else {
          // 最終段階：ゆっくり停止
          slowStop();
        }
      };

      fastSpin();
    } else if (!isSpinning && drawnNumber) {
      setDisplayNumbers([drawnNumber]);
      setRotation(0);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [isSpinning, drawnNumber]);

  const slowStop = () => {
    let count = 0;
    const finalStop = () => {
      if (count < 3) {
        setDisplayNumbers([Math.floor(Math.random() * 75) + 1]);
        count++;
        timeoutId.current = setTimeout(finalStop, 500);
      } else {
        // 最終的な数字を表示
        setDisplayNumbers([drawnNumber!]);
        setRotation(0);
        onAnimationEnd();
      }
    };
    finalStop();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-red-800 to-orange-700 rounded-lg shadow-2xl border-4 border-yellow-500">
      <div className="relative w-40 h-40 bg-black flex items-center justify-center rounded-full overflow-hidden shadow-inner border-8 border-yellow-400">
        {/* 回転する光のエフェクト */}
        {isSpinning && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `conic-gradient(from ${rotation}deg, transparent, yellow, transparent, red, transparent)`,
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s linear'
            }}
          />
        )}

        {/* 数字表示 */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          {displayNumbers.length > 0 ? (
            <div
              key={displayNumbers[0]}
              className={`text-6xl font-black ${isSpinning ? 'text-yellow-300 animate-pulse' : 'text-green-400'}`}
              style={{
                textShadow: isSpinning
                  ? '0 0 20px rgba(255, 255, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.5)'
                  : '0 0 20px rgba(0, 255, 0, 0.8)',
                transform: isSpinning ? `rotate(${rotation * 2}deg) scale(${1 + Math.sin(rotation / 20) * 0.2})` : 'none',
                transition: 'transform 0.1s ease-out'
              }}
            >
              {displayNumbers[0]}
            </div>
          ) : (
            <div className="text-6xl font-black text-gray-600">-</div>
          )}
        </div>

        {/* 回転する外周エフェクト */}
        {isSpinning && (
          <>
            <div
              className="absolute inset-0 border-4 border-dashed border-yellow-300 rounded-full opacity-50"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.05s linear'
              }}
            />
            <div
              className="absolute inset-2 border-4 border-dashed border-red-400 rounded-full opacity-30"
              style={{
                transform: `rotate(${-rotation * 1.5}deg)`,
                transition: 'transform 0.05s linear'
              }}
            />
          </>
        )}
      </div>

      <div className="mt-3 text-base font-bold">
        {isSpinning ? (
          <span className="text-yellow-300 animate-pulse">🎰 抽選中...</span>
        ) : (
          <span className="text-green-400">✨ 番号決定！</span>
        )}
      </div>
    </div>
  );
}
