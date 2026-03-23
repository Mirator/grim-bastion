import { defineConfig } from "vite";

export default defineConfig({
  // Emit relative asset URLs so the build works from a GitHub Pages project subpath.
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    // Three.js + Rapier are large runtime dependencies for this project.
    // Raise the warning threshold to avoid noisy false alarms in normal builds.
    chunkSizeWarningLimit: 3500,
  },
});
