import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

// Plugin: copy overlay.css to dist/assets after build
function copyExtensionAssets() {
  return {
    name: "copy-extension-assets",
    closeBundle() {
      mkdirSync("dist/assets", { recursive: true });
      copyFileSync("src/assets/overlay.css", "dist/assets/overlay.css");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssets()],
  root: "src",
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        background: resolve(__dirname, "src/background/service-worker.js"),
        "content-monkeytype": resolve(
          __dirname,
          "src/content/sites/monkeytype.js",
        ),
        overlay: resolve(__dirname, "src/content/overlay/overlay.js"),
      },
      output: {
        entryFileNames: (chunk) => {
          const map = {
            background: "background/service-worker.js",
            "content-monkeytype": "content/monkeytype.js",
            overlay: "content/overlay.js",
          };
          return map[chunk.name] || "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
