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
        navigateFallback: null, // don't intercept navigation — multi-page app
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^\/trpc\//,
            handler: "NetworkOnly",
          },
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
