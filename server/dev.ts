import { createMetaServer } from "./app"

const DEFAULT_PORT = 8787

function readPort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return DEFAULT_PORT
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

const port = readPort(process.env["PORT"])
const server = createMetaServer({ env: process.env })

server.listen(port, "127.0.0.1", () => {
  console.log(`Meta Step 3 local server listening on http://127.0.0.1:${port}`)
  console.log("No secrets are logged. Only explicit token-status and long-lived exchange routes perform Meta API calls.")
})
