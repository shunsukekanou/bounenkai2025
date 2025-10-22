import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 新しいプロンプトファイルのパスを取得
    const filePath = path.join(process.cwd(), 'AI相談プロンプト.md')

    // ファイルが存在するかチェック
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Prompt file not found' })
    }

    // ファイルを読み込み
    const fileContent = fs.readFileSync(filePath, 'utf-8')

    // Markdownから実際のプロンプト部分を抽出（新しいフォーマットに対応）
    const promptMatch = fileContent.match(/# ✅ 改善活動アテンダントAI プロンプト【改訂版】([\s\S]*?)(?=---|\n## 📝 管理情報|$)/)

    if (!promptMatch) {
      return res.status(500).json({ error: 'Prompt content not found in file' })
    }

    const promptContent = promptMatch[1].trim()

    res.status(200).json({
      success: true,
      prompt: promptContent,
      lastUpdated: fs.statSync(filePath).mtime
    })
  } catch (error) {
    console.error('Error reading prompt file:', error)
    res.status(500).json({ error: 'Failed to read prompt file' })
  }
}