/**
 * PDF生成ユーティリティ
 * html2canvasとjsPDFを使用してPDFを生成
 */

/**
 * 要素をPDFに変換してダウンロード
 * @param {string} elementId - PDF化する要素のID
 * @param {Object} options - オプション
 * @param {string} options.fileName - 保存ファイル名
 * @param {number} options.width - PDF幅（デフォルト: 1800）
 * @param {number} options.height - PDF高さ（オプション）
 * @param {string} options.orientation - 'portrait'(縦) または 'landscape'(横)（デフォルト: 'landscape'）
 * @param {number} options.scale - html2canvasのスケール（デフォルト: 2）
 * @param {boolean} options.maintainAspectRatio - アスペクト比を維持するか（デフォルト: false）
 * @param {number} options.margin - 余白（mm）（デフォルト: 0）
 * @param {boolean} options.fillPage - ページ全体に配置するか（デフォルト: true）
 * @param {boolean} options.openInNewTab - 新しいタブで開くか（デフォルト: false）
 * @param {Function} options.onSuccess - 成功時のコールバック
 * @param {Function} options.onError - エラー時のコールバック
 */
export const generatePDF = async (elementId, options = {}) => {
  const {
    fileName = 'document.pdf',
    width = 1800,
    height = null,
    orientation = 'landscape',
    scale = 2,
    maintainAspectRatio = false,
    margin = 0,
    fillPage = true,
    openInNewTab = false,
    onSuccess,
    onError
  } = options

  try {
    // 動的にhtml2canvasとjsPDFを読み込み
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default

    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default

    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`要素 #${elementId} が見つかりません`)
    }

    // PDF生成用に一時的にスタイルを変更
    const originalWidth = element.style.width
    const originalMaxWidth = element.style.maxWidth
    element.style.width = `${width}px`
    element.style.maxWidth = `${width}px`
    if (height) {
      element.style.height = `${height}px`
    }

    // textareaを一時的に非表示にしてdivで表示
    const textareas = element.querySelectorAll('textarea')
    const replacementDivs = []

    textareas.forEach(textarea => {
      const div = document.createElement('div')
      div.textContent = textarea.value

      // textareaのスタイルをコピー
      const computedStyle = window.getComputedStyle(textarea)
      div.style.cssText = textarea.style.cssText
      div.style.width = computedStyle.width
      div.style.height = 'auto'
      div.style.minHeight = computedStyle.height
      div.style.padding = computedStyle.padding
      div.style.border = computedStyle.border
      div.style.borderRadius = computedStyle.borderRadius
      div.style.fontSize = computedStyle.fontSize
      div.style.backgroundColor = computedStyle.backgroundColor
      div.style.whiteSpace = 'pre-wrap'
      div.style.wordBreak = 'break-all'
      div.style.overflowWrap = 'break-word'
      div.style.overflow = 'visible'

      textarea.style.display = 'none'
      textarea.parentNode.insertBefore(div, textarea)
      replacementDivs.push({ textarea, div })
    })

    // 要素をキャンバスに変換
    const canvasOptions = {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: width
    }
    if (height) {
      canvasOptions.height = height
    }
    const canvas = await html2canvas(element, canvasOptions)

    // スタイルを元に戻す
    element.style.width = originalWidth
    element.style.maxWidth = originalMaxWidth
    replacementDivs.forEach(({ textarea, div }) => {
      div.remove()
      textarea.style.display = ''
    })

    // PDFサイズの設定
    const pdf = new jsPDF(orientation, 'mm', 'a4')
    const pdfWidth = orientation === 'landscape' ? 297 : 210
    const pdfHeight = orientation === 'landscape' ? 210 : 297

    const imgData = canvas.toDataURL('image/png')

    // 配置方法の選択
    if (fillPage && !maintainAspectRatio) {
      // ページ全体に配置（アスペクト比無視）
      pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth - (margin * 2), pdfHeight - (margin * 2))
    } else if (maintainAspectRatio) {
      // アスペクト比を維持して配置
      const contentWidth = pdfWidth - (margin * 2)
      const contentHeight = pdfHeight - (margin * 2)
      const canvasAspectRatio = canvas.width / canvas.height
      const a4AspectRatio = contentWidth / contentHeight

      let finalWidth, finalHeight, xOffset, yOffset

      if (canvasAspectRatio > a4AspectRatio) {
        // 画像が横長の場合
        finalWidth = contentWidth
        finalHeight = contentWidth / canvasAspectRatio
        xOffset = margin
        yOffset = margin + (contentHeight - finalHeight) / 2
      } else {
        // 画像が縦長の場合
        finalHeight = contentHeight
        finalWidth = contentHeight * canvasAspectRatio
        xOffset = margin + (contentWidth - finalWidth) / 2
        yOffset = margin
      }

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight)
    } else {
      // マージンのみ考慮
      pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth - (margin * 2), pdfHeight - (margin * 2))
    }

    // PDFをダウンロードまたは新しいタブで開く
    if (openInNewTab) {
      const pdfBlob = pdf.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    } else {
      pdf.save(fileName)
    }

    if (onSuccess) onSuccess()

  } catch (error) {
    console.error('PDF生成エラー:', error)
    if (onError) onError(error)
    throw error
  }
}
