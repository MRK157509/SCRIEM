import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ✅ Preferred: everything backend goes through /api
      "/api": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // ✅ Optional convenience routes (no rewrite)
      "/alerts": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        secure: false,
      },
      "/events": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        secure: false,
      },
      "/timeline": {
        target: "http://127.0.0.1:9000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
