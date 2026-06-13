import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

declare const process: { env: Record<string, string | undefined> }

const base = process.env["GITHUB_PAGES"] === "true" ? "/insta-dm-automation/" : "/"

export default defineConfig({
  base,
  plugins: [react()],
})
