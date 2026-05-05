import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Lösenordet måste vara minst 6 tecken'); return }
    setError('')
    setLoading(true)
    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.message?.includes('email-already-in-use')) {
        setError('Det finns redan ett konto med den e-postadressen')
      } else {
        setError(err.message || 'Registrering misslyckades')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="text-5xl mb-3">✈️</div>
          <h1 className="text-2xl font-bold text-slate-900">Min Resa</h1>
          <p className="text-slate-500 text-sm mt-1">Skapa ditt konto</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Namn</label>
            <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              placeholder="Ditt namn" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-post</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              placeholder="du@exempel.se" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lösenord</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              placeholder="Min. 6 tecken" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Skapar konto…' : 'Skapa konto'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Har du redan ett konto?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Logga in</Link>
        </p>
      </div>
    </div>
  )
}
