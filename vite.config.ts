import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: {
      overlay: false,
    },
    strictPort: true,
    allowedHosts: [
      'connect-staging.preview.emergentagent.com',
      '.emergentagent.com',
      'localhost'
    ],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
