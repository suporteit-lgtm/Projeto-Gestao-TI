import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
    // Encaminha chamadas /api para o backend, evitando problemas de CORS no dev.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});