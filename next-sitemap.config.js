/** @type {import('next-sitemap').IConfig} */
module.exports = {
    // Priority given to environment variable, falling back to the new domain
    siteUrl: process.env.SITE_URL || 'https://azuretier.net',
    generateRobotsTxt: true,
    generateIndexSitemap: false,
    sitemapSize: 7000,

    // Combined exclusions from both files
    exclude: ['/api/*', '/admin/*', '/images/*', '/*.png', '/*.jpg', '/net*'],

    // Default values for pages not caught by the transform function
    changefreq: 'daily',
    priority: 0.7,

    // Additional paths to include (static pages)
    additionalPaths: async (config) => {
        return [];
    },

    // Transform function for i18n and custom priority logic
    transform: async (config, path) => {
        return {
            loc: path,
            // Prioritize homepage and language roots
            changefreq: config.changefreq,
            priority: ['/', '/en', '/ja'].includes(path) ? 1.0 : config.priority,
            lastmod: new Date().toISOString(),
        };
    },

    // Robots.txt policy alignment
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/', '/images/', '/net*'],
            },
        ],
    },
};