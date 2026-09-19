import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Three.js fica em um chunk sob demanda e não bloqueia o carregamento do jogo.
    chunkSizeWarningLimit: 550,
  },
});
