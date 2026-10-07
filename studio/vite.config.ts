import { defineConfig } from 'vite';

// Projects live in ./projects/<name>/ (song.mp3, audio.json, lyrics.json, timeline.ts) and are served from the root.
// STUDIO_NO_HMR=1 for export renders (no reload mid-render when a file changes).
export default defineConfig({
  server: { port: 5180, strictPort: false, hmr: process.env.STUDIO_NO_HMR ? false : undefined },
  build: { target: 'esnext' },
});
