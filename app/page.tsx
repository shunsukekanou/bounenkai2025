import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl p-6 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-gray-800 tracking-tight">
            ビンゴゲーム
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-medium">
            忘年会・懇親会を盛り上げる
          </p>
          <p className="text-lg text-gray-500">
            スマートフォンで楽しむリアルタイムビンゴ
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-white p-6 rounded-lg shadow-md text-center space-y-2">
            <div className="text-4xl">📱</div>
            <h3 className="font-bold text-gray-800">スマホで完結</h3>
            <p className="text-sm text-gray-600">紙のカードもペンも不要</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center space-y-2">
            <div className="text-4xl">🎰</div>
            <h3 className="font-bold text-gray-800">リアルタイム同期</h3>
            <p className="text-sm text-gray-600">全員の状況が瞬時に共有</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h3 className="font-bold text-gray-800">静かに盛り上がる</h3>
            <p className="text-sm text-gray-600">騒げない会場でもOK</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
          <Link
            href="/organizer"
            className="flex-1 group"
          >
            <div className="bg-blue-600 hover:bg-blue-700 text-white p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl text-center space-y-3">
              <div className="text-5xl">👔</div>
              <h2 className="text-2xl font-bold">幹事の方はこちら</h2>
              <p className="text-blue-100">ゲームを作成・管理する</p>
              <div className="pt-2 text-sm font-semibold">→ 管理画面へ</div>
            </div>
          </Link>

          <Link
            href="/participant"
            className="flex-1 group"
          >
            <div className="bg-green-600 hover:bg-green-700 text-white p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl text-center space-y-3">
              <div className="text-5xl">🎮</div>
              <h2 className="text-2xl font-bold">参加者の方はこちら</h2>
              <p className="text-green-100">ゲームコードで参加する</p>
              <div className="pt-2 text-sm font-semibold">→ ゲームに参加</div>
            </div>
          </Link>
        </div>

        {/* How to Use */}
        <div className="w-full max-w-2xl bg-white/70 backdrop-blur p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">使い方</h3>
          <ol className="space-y-2 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="font-bold text-blue-600 min-w-[24px]">1.</span>
              <span>幹事が「管理画面」からゲームを作成し、ゲームコードを参加者に共有</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-green-600 min-w-[24px]">2.</span>
              <span>参加者が「ゲームに参加」からゲームコードを入力して参加</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-yellow-600 min-w-[24px]">3.</span>
              <span>3枚のカードから好きな1枚を選択</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-red-600 min-w-[24px]">4.</span>
              <span>幹事が番号を抽選し、ビンゴを目指す</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t bg-white/50 backdrop-blur py-6 text-center text-sm text-gray-600">
        <p>Powered by Next.js & Supabase</p>
      </footer>
    </main>
  );
}
