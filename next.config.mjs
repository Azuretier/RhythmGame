/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['azuret.net'], // 必要に応じてドメインを追加
      loader: 'akamai', // 画像の最適化設定
      path: '', // 画像パスを指定
    },
  };
  
  export default nextConfig;
