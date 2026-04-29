const KEY = 'nutrimenu_credentials'

interface Credentials {
  email: string
  passwordHash: string
}

export function getCredentials(): Credentials | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveCredentials(creds: Credentials): void {
  localStorage.setItem(KEY, JSON.stringify(creds))
}

export function clearCredentials(): void {
  localStorage.removeItem(KEY)
}
