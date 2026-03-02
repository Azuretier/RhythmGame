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
    changefreq: 'weekly',
    priority: 0.7,

    // Additional paths to include — all locale-based routes
    additionalPaths: async (config) => {
        const locales = ['', '/en', '/th', '/es', '/fr'];
        const routes = [
            '',              // home
            '/arena',
            '/minecraft-board',
            '/stories',
            '/wiki',
            '/loyalty',
            '/updates',
            '/chapter',
            '/echoes',
            '/minecraft-world',
            '/inventory',
            '/tower-defense',
        ];

        const paths = [];
        for (const locale of locales) {
            for (const route of routes) {
                const loc = `${locale}${route}` || '/';
                const isHome = route === '';
                paths.push({
                    loc,
                    changefreq: isHome ? 'daily' : 'weekly',
                    priority: isHome ? 1.0 : route === '/wiki' ? 0.9 : 0.7,
                    lastmod: new Date().toISOString(),
                });
            }
        }
        return paths;
    },

    // Transform function for i18n and custom priority logic
    transform: async (config, path) => {
        // Skip paths that are already handled by additionalPaths
        const localeRoutes = [
            '/', '/en', '/th', '/es', '/fr',
            '/arena', '/minecraft-board', '/stories', '/wiki',
            '/loyalty', '/updates', '/chapter', '/echoes',
            '/minecraft-world', '/inventory', '/tower-defense',
        ];
        const isLocaleRoute = localeRoutes.some(
            (r) => path === r || path.match(new RegExp(`^/(en|th|es|fr)${r === '/' ? '$' : r + '$'}`))
        );
        if (isLocaleRoute) return null;

        return {
            loc: path,
            changefreq: config.changefreq,
            priority: config.priority,
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
