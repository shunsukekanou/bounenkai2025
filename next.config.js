const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 開発中は無効化
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Codespaces対応
  async rewrites() {
    return []
  },
  // 開発環境でのホスト設定
  ...(process.env.CODESPACES && {
    experimental: {
      externalDir: true,
    },
  }),
}

module.exports = withPWA(nextConfig)