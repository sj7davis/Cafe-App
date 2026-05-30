import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "*.png"],
      manifest: {
        name: "B1 Platform — Order",
        short_name: "B1 Order",
        description: "Order from your favourite cafe",
        theme_color: "#F8F6F2",
        background_color: "#F8F6F2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: null,
        // Only precache small static assets — not the large JS bundle.
        // JS changes on every deploy so network-first is better for it.
        globPatterns: ["**/*.{css,html,png,ico,svg,webmanifest}"],
        // Raise the per-file limit so a future CSS/icon approaching 3 MB
        // doesn't break the build without a clear error message.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        runtimeCaching: [
          // Never cache API or tRPC — always go to network
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^\/trpc\//,
            handler: "NetworkOnly",
          },
          // JS bundles: network-first with 7-day cache fallback
          {
            urlPattern: /\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-bundles",
              expiration: { maxEntries: 10, maxAgeSeconds: 604800 },
            },
          },
          // Venue pages: stale-while-revalidate for fast perceived load
          {
            urlPattern: /\/v\/[^/]+$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "venue-pages",
              expiration: { maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
      "@contracts": path.resolve(__dirname, "./contracts"),
    },
  },
});
