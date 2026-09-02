import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// TLS_CERT_FILE/TLS_KEY_FILE — jen pro lokální testování HTTPS (viz isms-api/src/server.js).
// V produkci TLS terminuje reverse proxy, dev server tyhle proměnné nemá nastavené.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const { TLS_CERT_FILE, TLS_KEY_FILE } = env;

  return {
    plugins: [react()],
    server: TLS_CERT_FILE && TLS_KEY_FILE
      ? { https: { cert: fs.readFileSync(TLS_CERT_FILE), key: fs.readFileSync(TLS_KEY_FILE) } }
      : {},
  };
});
