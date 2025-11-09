import Link from "next/link";
import MobileOnlyGuard from "@/components/mobile-only-guard";

export default function Home() {
  return (
    <MobileOnlyGuard>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="flex-1 flex flex-col items-center justify-center w-full p-4 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">
              ビンゴゲーム
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              忘年会・懇親会を盛り上げる
            </p>
            <p className="text-sm text-gray-500">
              スマートフォンで楽しむリアルタイムビンゴ
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4 w-full px-4">
            <div className="bg-white p-5 rounded-lg shadow-md text-center space-y-2">
              <div className="text-3xl">📱</div>
              <h3 className="font-bold text-gray-800">スマホで完結</h3>
              <p className="text-xs text-gray-600">紙のカードもペンも不要</p>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-md text-center space-y-2">
              <div className="text-3xl">🎰</div>
              <h3 className="font-bold text-gray-800">リアルタイム同期</h3>
              <p className="text-xs text-gray-600">全員の状況が瞬時に共有</p>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-md text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <h3 className="font-bold text-gray-800">静かに盛り上がる</h3>
              <p className="text-xs text-gray-600">騒げない会場でもOK</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full px-4">
            <Link href="/organizer" className="w-full group">
              <div className="bg-blue-600 active:bg-blue-700 text-white p-6 rounded-xl shadow-lg text-center space-y-2">
                <div className="text-4xl">👔</div>
                <h2 className="text-xl font-bold">幹事の方はこちら</h2>
                <p className="text-sm text-blue-100">ゲームを作成・管理する</p>
                <div className="pt-1 text-xs font-semibold">→ 管理画面へ</div>
              </div>
            </Link>

            <Link href="/participant" className="w-full group">
              <div className="bg-green-600 active:bg-green-700 text-white p-6 rounded-xl shadow-lg text-center space-y-2">
                <div className="text-4xl">🎮</div>
                <h2 className="text-xl font-bold">参加者の方はこちら</h2>
                <p className="text-sm text-green-100">ゲームコードで参加する</p>
                <div className="pt-1 text-xs font-semibold">→ ゲームに参加</div>
              </div>
            </Link>
          </div>

          {/* How to Use */}
          <div className="w-full bg-white/90 backdrop-blur p-6 rounded-lg shadow-lg border-2 border-gray-200 mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">📖 かんたん3ステップ</h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800 mb-1">👔 幹事：ゲームを作成</h4>
                  <p className="text-xs text-gray-700 mb-1">上の青いボタン「幹事の方はこちら」をタップ</p>
                  <p className="text-xs text-gray-600">→「新しいゲームを作成する」ボタンを押すと、6文字のゲームコード（例：ABC123）が表示されます</p>
                  <p className="text-xs text-blue-700 font-semibold mt-1">💡 このゲームコードを参加者全員に共有してください（LINEグループなどで）</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800 mb-1">🎮 参加者：ゲームに参加</h4>
                  <p className="text-xs text-gray-700 mb-1">上の緑のボタン「参加者の方はこちら」をタップ</p>
                  <p className="text-xs text-gray-600 mb-0.5">→ 幹事から教えてもらったゲームコードを入力</p>
                  <p className="text-xs text-gray-600 mb-0.5">→ 自分の名前を入力（ランキングに表示されます）</p>
                  <p className="text-xs text-gray-600">→ 3枚のビンゴカードから好きな1枚を選択</p>
                  <p className="text-xs text-green-700 font-semibold mt-1">💡 カードを選んだら、ゲーム開始を待ちましょう</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-600 text-white rounded-full flex items-center justify-center text-lg font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800 mb-1">🎰 ゲーム開始</h4>
                  <p className="text-xs text-gray-700 mb-1">幹事が「次の数字を抽選する」ボタンを押すと、スロットマシン風のアニメーションで番号が発表されます</p>
                  <p className="text-xs text-gray-600 mb-0.5">→ 当選番号は参加者全員の画面に自動反映され、該当する数字が自動でマークされます</p>
                  <p className="text-xs text-gray-600 mb-0.5">→ 縦・横・斜めのいずれか1列が揃ったら自動的にビンゴ！</p>
                  <p className="text-xs text-yellow-700 font-semibold mt-1">🏆 ビンゴになった順に1位、2位、3位...とランキングが全員の画面に表示されます</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-bold text-sm text-gray-800 mb-2">💡 ポイント</h4>
              <ul className="text-xs text-gray-700 space-y-0.5">
                <li>• インターネット接続が必要です（Wi-Fiまたはモバイルデータ通信）</li>
                <li>• 画面は自動更新されるので、リロード不要です</li>
                <li>• 幹事と参加者は別々のスマホで操作します</li>
                <li>• 参加者は何人でもOK（30〜50人規模でも動作します）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full border-t bg-white/50 backdrop-blur py-4 text-center text-xs text-gray-600">
          <p>Powered by Next.js & Supabase</p>
        </footer>
      </main>
    </MobileOnlyGuard>
  );
}
