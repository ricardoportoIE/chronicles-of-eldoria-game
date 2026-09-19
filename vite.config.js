import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Three.js stays in an on-demand chunk and does not block the game from loading.
    chunkSizeWarningLimit: 550,
  },
});
