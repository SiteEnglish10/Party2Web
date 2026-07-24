import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// COOP/COEP 头用于让 ffmpeg.wasm 使用 SharedArrayBuffer。
// credentialless 允许跨源加载 ffmpeg core 而无需对方返回 CORP 头。
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: isolationHeaders,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/uploads": "http://127.0.0.1:8000",
    },
  },
  preview: {
    headers: isolationHeaders,
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
});
