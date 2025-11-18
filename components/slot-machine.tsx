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
  const rouletteAudioRef = useRef<HTMLAudioElement | null>(null);

  // 音声ファイルを初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      rouletteAudioRef.current = new Audio('/sounds/roulette.wav');
      rouletteAudioRef.current.loop = true; // ループ再生
      rouletteAudioRef.current.volume = 0.7; // 音量調整（0.0〜1.0）
    }
  }, []);

  // 音声関数
  const playDrumroll = () => {
    if (rouletteAudioRef.current) {
      try {
        rouletteAudioRef.current.currentTime = 0; // 最初から再生
        rouletteAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      } catch (e) {
        console.log('Audio not supported');
      }
    }
  };

  const stopDrumroll = () => {
    if (rouletteAudioRef.current) {
      try {
        rouletteAudioRef.current.pause();
        rouletteAudioRef.current.currentTime = 0;
      } catch (e) {
        // Already stopped
      }
    }
  };

  // 「てっ」という止まりかけの音
  const playTickSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const playWinSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // ファンファーレのような音
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

        const startTime = audioContext.currentTime + index * 0.15;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      });
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const spinStartTime = useRef<number>(0);

  useEffect(() => {
    // isSpinning が true になったらアニメーションを開始
    if (isSpinning) {
      // ドラムロール音を再生
      playDrumroll();
      spinStartTime.current = Date.now();

      const fastSpin = () => {
        const elapsed = Date.now() - spinStartTime.current;

        // 3.4秒間、高速回転を続ける
        if (elapsed < 3400) {
          setDisplayNumbers(Array.from({ length: 5 }, () => Math.floor(Math.random() * 75) + 1));
          setRotation(prev => (prev + 72) % 360); // 激しく回転
          animationFrameId.current = requestAnimationFrame(fastSpin);
        } else {
          // 3.4秒経過したら、アニメーションフレームをキャンセルして停止シーケンスに移行
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
          }
          // drawnNumber が null の場合は、onAnimationEnd が呼ばれるまで待機
          if (drawnNumber !== null) {
            slowStop();
          }
        }
      };

      // アニメーションループを開始
      animationFrameId.current = requestAnimationFrame(fastSpin);

    } else {
      // isSpinning が false になったら、すべてをクリーンアップ
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      stopDrumroll();
      // 最終的な数字を確実に表示
      if (drawnNumber) {
        setDisplayNumbers([drawnNumber]);
      }
      setRotation(0);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (timeoutId.current) clearTimeout(timeoutId.current);
      stopDrumroll();
    };
    // isSpinning の変更時のみこのエフェクトを実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // drawnNumber が更新されたら、必要に応じて停止シーケンスを開始
  useEffect(() => {
    // スピンが終了すべきタイミング (3.4秒後) を過ぎていて、かつ drawnNumber が届いた場合
    if (isSpinning && drawnNumber !== null && spinStartTime.current > 0 && Date.now() - spinStartTime.current >= 3400) {
      // まだ fastSpin ループが動いていれば止める
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      slowStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnNumber]);

  const slowStop = () => {
    // ドラムロール音を停止
    stopDrumroll();

    // 回転を停止
    setRotation(0);

    let count = 0;
    const finalStop = () => {
      if (count < 3) {
        // 「てっ」という音を再生
        playTickSound();
        // ランダムな数字を表示（回転は止まっている）
        setDisplayNumbers([Math.floor(Math.random() * 75) + 1]);
        count++;
        // 3テンポ → 0.8秒間隔
        timeoutId.current = setTimeout(finalStop, 800);
      } else {
        // 最終的な数字を表示
        setDisplayNumbers([drawnNumber!]);

        // 0.1秒後にファンファーレ音を再生
        setTimeout(() => {
          playWinSound();
        }, 100);

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
