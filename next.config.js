const withPWA = require('next-pwa')({
  dest: 'public',
  // Service workers can't be tested meaningfully in dev (hot reload fights
  // with caching), so it's disabled there and only builds in production.
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Never cache anything under /api/ — sheet data, auth, and admin actions
  // must always hit the network. Only static app-shell assets get cached
  // for the "installed app feels instant" effect.
  runtimeCaching: [
    {
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'images', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
    },
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-static' },
    },
    {
      urlPattern: /^\/$/,
      handler: 'NetworkFirst',
      options: { cacheName: 'app-shell', networkTimeoutSeconds: 5 },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
