import { getAuth, onAuthStateChanged } from 'firebase/auth'

const BASE = import.meta.env.VITE_API_URL

function waitForUser() {
  return new Promise((resolve) => {
    const auth = getAuth()
    if (auth.currentUser) return resolve(auth.currentUser)
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user) })
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

export const api = {
  get: async (path) =>
    fetch(`${BASE}${path}`, { headers: await headers() }).then(handleResponse),

  post: async (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  put: async (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: await headers(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: async (path) =>
    fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: await headers(),
    }).then(handleResponse),
}
