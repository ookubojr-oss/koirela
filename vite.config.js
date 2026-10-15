import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        lp: resolve(__dirname, 'lp.html')
      }
    }
  }
});
