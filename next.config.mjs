/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          // Specific rule for rhythmia-nexus.html to prevent caching
          source: '/(.*)',
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
        }
      ];
    },
    turbopack: {},
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
  };

export default nextConfig;
