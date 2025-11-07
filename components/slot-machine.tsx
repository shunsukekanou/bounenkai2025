'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SlotMachineProps {
  drawnNumber: number | null;
  isSpinning: boolean;
  onAnimationEnd: () => void;
}

export default function SlotMachine({ drawnNumber, isSpinning, onAnimationEnd }: SlotMachineProps) {
  const [displayNumber, setDisplayNumber] = useState<number | string>('-');
  const animationFrameId = useRef<number | null>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpinning && drawnNumber !== null) {
      // Fast spinning for 7 seconds
      const spinStartTime = Date.now();
      const fastSpin = () => {
        if (Date.now() - spinStartTime < 7000) {
          setDisplayNumber(Math.floor(Math.random() * 75) + 1);
          animationFrameId.current = requestAnimationFrame(fastSpin);
        } else {
          if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
          slowSpin(3); // Start slow spin for the last 3 seconds
        }
      };
      fastSpin();
    } else if (!isSpinning) {
        setDisplayNumber(drawnNumber ?? '-');
    }

    // Cleanup function
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [isSpinning, drawnNumber]);

  const slowSpin = (remainingSpins: number) => {
    if (remainingSpins > 0) {
      setDisplayNumber(Math.floor(Math.random() * 75) + 1);
      timeoutId.current = setTimeout(() => slowSpin(remainingSpins - 1), 1000);
    } else {
      // Set the final number and end the animation
      setDisplayNumber(drawnNumber!);
      onAnimationEnd();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-lg border-4 border-gray-600">
      <div className="w-48 h-48 bg-black flex items-center justify-center rounded-md overflow-hidden">
        <div
          key={displayNumber.toString()} // Key change can help trigger re-render animations
          className={`text-8xl font-bold text-white animate-fade-in-fast
            ${isSpinning ? 'text-yellow-400' : 'text-green-400'}
          `}
        >
          {displayNumber}
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-400">
        {isSpinning ? '抽選中...' : '番号決定！'}
      </div>
    </div>
  );
}
