import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mediapipeWasmPlugin() {
  const wasmDir = path.resolve(__dirname, 'node_modules/@mediapipe/tasks-vision/wasm');
  const mimeTypes = {
    '.js': 'application/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
  };

  return {
    name: 'mediapipe-wasm-assets',
    configureServer(server) {
      server.middlewares.use('/mediapipe/wasm', (req, res, next) => {
        const cleanPath = (req.url || '/').split('?')[0].replace(/^\/+/, '');
        const filePath = path.join(wasmDir, path.basename(cleanPath));
        if (cleanPath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
          }
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });
    },
    closeBundle() {
      const distRoot = path.resolve(__dirname, 'dist');
      const wasmDist = path.resolve(distRoot, 'mediapipe/wasm');
      if (fs.existsSync(distRoot) && fs.existsSync(wasmDir)) {
        fs.cpSync(wasmDir, wasmDist, { recursive: true, force: true });
      }
      const srcAssets = path.resolve(__dirname, 'src/assets');
      const distAssets = path.resolve(distRoot, 'src/assets');
      if (fs.existsSync(distRoot) && fs.existsSync(srcAssets)) {
        fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_BASE_URL || 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss(), mediapipeWasmPlugin()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
