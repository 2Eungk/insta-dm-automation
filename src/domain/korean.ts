const HANGUL_BASE_CODE = 0xac00
const HANGUL_END_CODE = 0xd7a3
const HANGUL_FINAL_CONSONANT_COUNT = 28

function finalVisibleCharacter(value: string): string {
  return value.trim().slice(-1)
}

function hasFinalConsonant(value: string): boolean {
  const character = finalVisibleCharacter(value)
  const code = character.charCodeAt(0)

  if (Number.isNaN(code) || code < HANGUL_BASE_CODE || code > HANGUL_END_CODE) {
    return false
  }

  return (code - HANGUL_BASE_CODE) % HANGUL_FINAL_CONSONANT_COUNT !== 0
}

export function appendEuroParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "으로" : "로"}`
}
