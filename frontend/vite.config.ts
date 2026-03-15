import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        '/auth': 'http://localhost:4000',
        '/hotels': 'http://localhost:4000',
        '/hotel-settings': 'http://localhost:4000',
        '/rooms': 'http://localhost:4000',
        '/stays': 'http://localhost:4000',
        '/payments': 'http://localhost:4000',
        '/expenses': 'http://localhost:4000',
        '/transfers': 'http://localhost:4000',
        '/reports': 'http://localhost:4000',
        '/users': 'http://localhost:4000',
        '/custom-payment-methods': 'http://localhost:4000',
        '/month-closings': 'http://localhost:4000',
        '/withdrawals': 'http://localhost:4000',
        '/guests': 'http://localhost:4000',
        '/health': 'http://localhost:4000',
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
