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
        <div className="w-full max-w-3xl bg-white/90 backdrop-blur p-8 rounded-lg shadow-lg border-2 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">📖 かんたん3ステップ</h3>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-800 mb-2">👔 幹事：ゲームを作成</h4>
                <p className="text-gray-700 mb-2">上の青いボタン「幹事の方はこちら」をタップ</p>
                <p className="text-sm text-gray-600">→「新しいゲームを作成する」ボタンを押すと、6文字のゲームコード（例：ABC123）が表示されます</p>
                <p className="text-sm text-blue-700 font-semibold mt-2">💡 このゲームコードを参加者全員に共有してください（LINEグループなどで）</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-800 mb-2">🎮 参加者：ゲームに参加</h4>
                <p className="text-gray-700 mb-2">上の緑のボタン「参加者の方はこちら」をタップ</p>
                <p className="text-sm text-gray-600 mb-1">→ 幹事から教えてもらったゲームコードを入力</p>
                <p className="text-sm text-gray-600 mb-1">→ 自分の名前を入力（ランキングに表示されます）</p>
                <p className="text-sm text-gray-600">→ 3枚のビンゴカードから好きな1枚を選択</p>
                <p className="text-sm text-green-700 font-semibold mt-2">💡 カードを選んだら、ゲーム開始を待ちましょう</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xl font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-800 mb-2">🎰 ゲーム開始</h4>
                <p className="text-gray-700 mb-2">幹事が「次の数字を抽選する」ボタンを押すと、スロットマシン風のアニメーションで番号が発表されます</p>
                <p className="text-sm text-gray-600 mb-1">→ 当選番号は参加者全員の画面に自動反映され、該当する数字が自動でマークされます</p>
                <p className="text-sm text-gray-600 mb-1">→ 縦・横・斜めのいずれか1列が揃ったら自動的にビンゴ！</p>
                <p className="text-sm text-yellow-700 font-semibold mt-2">🏆 ビンゴになった順に1位、2位、3位...とランキングが全員の画面に表示されます</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-bold text-gray-800 mb-2">💡 ポイント</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• インターネット接続が必要です（Wi-Fiまたはモバイルデータ通信）</li>
              <li>• 画面は自動更新されるので、リロード不要です</li>
              <li>• 幹事と参加者は別々のスマホで操作します</li>
              <li>• 参加者は何人でもOK（30〜50人規模でも動作します）</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t bg-white/50 backdrop-blur py-6 text-center text-sm text-gray-600">
        <p>Powered by Next.js & Supabase</p>
      </footer>
    </main>
  );
}
