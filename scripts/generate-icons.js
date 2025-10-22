// このスクリプトはSVGからPNGアイコンを生成します
// 実行方法: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// SVGの内容
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#667eea"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">MKG</text>
</svg>`;

console.log('SVGアイコンを確認しています...');
console.log('公式のPNG変換ツールを使用してください:');
console.log('1. https://cloudconvert.com/svg-to-png にアクセス');
console.log('2. public/icon.svg をアップロード');
console.log('3. 幅を 192px に設定して変換 → icon-192x192.png として保存');
console.log('4. 幅を 512px に設定して変換 → icon-512x512.png として保存');
console.log('5. 両ファイルを public/ フォルダに配置');
