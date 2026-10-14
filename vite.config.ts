import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { iwsdkDev } from '@iwsdk/vite-plugin-dev';

// HTTPS es obligatorio para WebXR en el Quest Browser (mkcert genera el certificado local).
// iwsdkDev inyecta un emulador XR (solo en desarrollo) para iterar desde el escritorio.
export default defineConfig(({ command }) => ({
  // GitHub Pages sirve el sitio bajo /TestVRCloude/; en desarrollo se usa la raíz.
  base: command === 'build' ? '/TestVRCloude/' : '/',
  server: { host: true, port: 8081, open: false },
  plugins: [
    mkcert(),
    iwsdkDev({ emulator: { device: 'metaQuest3' } }),
  ],
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
}));
