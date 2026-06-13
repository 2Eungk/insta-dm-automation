import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const viteConfig = await readFile("vite.config.ts", "utf8")
const packageJson = JSON.parse(await readFile("package.json", "utf8"))
const workflow = await readFile(".github/workflows/deploy-pages.yml", "utf8")
const readme = await readFile("README.md", "utf8")
const app = await readFile("src/App.tsx", "utf8")

assert.equal(viteConfig.includes("GITHUB_PAGES"), true, "Vite build must switch base path for GitHub Pages only")
assert.equal(viteConfig.includes("/insta-dm-automation/"), true, "GitHub Pages subpath must be configured")
assert.equal(packageJson.scripts["deploy:check"], "node scripts/static-deploy-smoke-check.mjs", "deploy smoke script must be runnable")
assert.equal(packageJson.scripts.check.includes("static-deploy-smoke-check.mjs"), true, "aggregate check must include deploy smoke check")
assert.equal(workflow.includes("actions/deploy-pages"), true, "GitHub Pages workflow must deploy static dist")
assert.equal(workflow.includes("npm run build"), true, "workflow must build the Vite app")
assert.equal(workflow.includes("GITHUB_PAGES: \"true\""), true, "workflow must set GitHub Pages base env")
assert.equal(readme.includes("https://2eungk.github.io/insta-dm-automation/"), true, "README must show the friend beta URL")
assert.equal(readme.includes("실제 Instagram/Meta API, 토큰, 백엔드, 자동 발송은 포함하지 않습니다."), true, "README must keep the no-real-send warning")
assert.equal(app.includes("Friends beta web demo"), true, "first viewport must disclose friends beta web demo mode")

console.log("static-deploy-smoke-check: GitHub Pages static demo guard passed")
