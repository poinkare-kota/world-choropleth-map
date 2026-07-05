import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages はサブパス配信のため base をリポジトリ名に合わせる。
// リポジトリ名を変えた場合はここも変更すること。
export default defineConfig({
  base: "/world-choropleth-map/",
  plugins: [react()],
});
