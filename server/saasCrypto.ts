import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import type { RuntimeEnv } from "./config"

export type TokenCiphertext = {
  readonly version: "local-dev-aes-256-gcm"
  readonly ciphertext: string
}

export type TokenEncryption = {
  readonly encrypt: (tokenValue: string) => TokenCiphertext
  readonly decryptForInternalUseOnly: (ciphertext: TokenCiphertext) => string
}

class MissingDevEncryptionKeyError extends Error {
  constructor() {
    super("Set DEV_ENCRYPTION_KEY for local token-encryption tests. Do not use this placeholder key strategy in production.")
    this.name = "MissingDevEncryptionKeyError"
  }
}

class MalformedTokenCiphertextError extends Error {
  constructor() {
    super("Encrypted token payload is malformed.")
    this.name = "MalformedTokenCiphertextError"
  }
}

function readKeyMaterial(env: RuntimeEnv): Buffer {
  const value = env["DEV_ENCRYPTION_KEY"]?.trim()
  if (value === undefined || value.length < 16) {
    throw new MissingDevEncryptionKeyError()
  }
  return createHash("sha256").update(value).digest()
}

export function createLocalDevTokenEncryption(env: RuntimeEnv): TokenEncryption {
  const key = readKeyMaterial(env)

  return {
    encrypt(tokenValue) {
      const iv = randomBytes(12)
      const cipher = createCipheriv("aes-256-gcm", key, iv)
      const encrypted = Buffer.concat([cipher.update(tokenValue, "utf8"), cipher.final()])
      const tag = cipher.getAuthTag()
      return {
        version: "local-dev-aes-256-gcm",
        ciphertext: `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`,
      }
    },
    decryptForInternalUseOnly(ciphertext) {
      const [ivPart, tagPart, encryptedPart] = ciphertext.ciphertext.split(".")
      if (ivPart === undefined || tagPart === undefined || encryptedPart === undefined) {
        throw new MalformedTokenCiphertextError()
      }
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"))
      decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
      return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8")
    },
  }
}
