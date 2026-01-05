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
    webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader'],
    });
    
    // Handle discord.js modules that should only run on server
    if (isServer) {
      config.externals.push({
        bufferutil: 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
        'zlib-sync': 'zlib-sync',
      });
    }
    
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  };

export default nextConfig;
