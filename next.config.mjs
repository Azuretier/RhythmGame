/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          // Specific rule for rhythmia-nexus.html to prevent caching
          source: '/rhythmia-nexus.html',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ],
        },
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
