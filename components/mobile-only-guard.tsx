'use client';

import { useEffect, useState } from 'react';

export default function MobileOnlyGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow-2xl p-8 text-center space-y-6">
          <div className="text-6xl">📱</div>
          <h1 className="text-2xl font-bold text-gray-800">スマートフォン専用アプリです</h1>
          <div className="space-y-3 text-left">
            <p className="text-gray-700">このアプリはスマートフォンでのご利用を想定しています。</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-700 font-semibold mb-2">💡 アクセス方法</p>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. スマートフォンでQRコードを読み取る</li>
                <li>2. またはスマートフォンのブラウザでURLを入力</li>
              </ol>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-sm text-gray-700 font-semibold mb-2">🔧 開発者の方へ</p>
              <p className="text-xs text-gray-600">ブラウザの開発者ツールでモバイルビューに切り替えてご確認ください。</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
