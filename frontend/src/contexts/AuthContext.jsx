import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { queryClient } from '../lib/queryClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let prevUid = null
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        console.log(`[auth] Inloggad: ${u.email} (uid: ${u.uid})`)
      } else {
        console.log('[auth] Utloggad')
      }
      if (u?.uid !== prevUid) queryClient.clear()
      prevUid = u?.uid ?? null
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function register(email, password, displayName) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) await updateProfile(user, { displayName })
    return user
  }

  async function logout() {
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
