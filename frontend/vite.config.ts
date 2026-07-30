import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["logo.png", "logo.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Gestão T.I.",
        short_name: "Gestão T.I.",
        description: "Sistema de inventário e gestão de equipamentos de T.I.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#111815",
        theme_color: "#111815",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // API não deve ser cacheada com service worker (dados dinâmicos)
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    cors: true,
    // Encaminha chamadas /api para o backend, evitando problemas de CORS no dev.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});