import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173, // dev portni qat'iy belgilaymiz
    strictPort: true, // 5174 ga "sakramasin"
    proxy: {
      "/api": "http://localhost:5000", // backendga proxy
    },
  },
});
