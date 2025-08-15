/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          source: '/(.*)', // 画像のパス
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable', // 1年間キャッシュ
            },
          ],
        },
      ];
    },
    webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader'],
    });
    return config;
  },
  };

export default nextConfig;
