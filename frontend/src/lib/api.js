import { getAuth, onAuthStateChanged } from 'firebase/auth'

const BASE = import.meta.env.VITE_API_URL

function waitForUser() {
  return new Promise((resolve) => {
    const auth = getAuth()
    if (auth.currentUser) return resolve(auth.currentUser)
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user) })
    // Resolve with null after 5s if Firebase never fires
    setTimeout(() => { unsub(); resolve(null) }, 5000)
  })
}

async function headers() {
  const user = await waitForUser()
  const token = await user?.getIdToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function handleResponse(res) {
  const text = await res.text()
  if (!res.ok) {
    let message
    try { message = JSON.parse(text).error } catch { message = text }
    throw new Error(message || `HTTP ${res.status}`)
  }
  return text ? JSON.parse(text) : null
}

async function request(method, path, body) {
  const url = `${BASE}${path}`
  const start = Date.now()
  console.log(`[api] ${method} ${path}`)
  try {
    const res = await fetch(url, {
      method,
      headers: await headers(),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    const data = await handleResponse(res)
    console.log(`[api] ${method} ${path} → ${res.status} (${Date.now() - start}ms)`)
    return data
  } catch (err) {
    console.error(`[api] ${method} ${path} → FEL (${Date.now() - start}ms):`, err.message)
    throw err
  }
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
}
