import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // public/ is the build output, not Vite's static-assets directory
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: true,
    // Android 11 / Chromium 90 WebView on the Echo Show 5
    target: "chrome90",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false
  },
  plugins: [viteSingleFile()]
});
