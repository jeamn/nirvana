import { defineConfig } from "vite";
const base = process.env.NODE_ENV === "development" ? "" : "/nirvana"

export default defineConfig({
  base,
});
