import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Steam endpoints are Pages Functions, which Vite can't run. For sign-in to
// work locally, start `npm run dev:api` (wrangler on 8788) alongside this; the
// proxy keeps the browser on Vite's origin so the OpenID return_to matches.
// Without it, /api/* fails and the page falls back to the demo case.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Not the string shorthand: that sets changeOrigin, which rewrites
            // Host to wrangler's and sends Steam's redirect to the wrong port.
            '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false },
        },
    },
});
