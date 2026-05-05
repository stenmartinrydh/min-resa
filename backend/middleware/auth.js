import { getAuth } from 'firebase-admin/auth'
import '../lib/firebase.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }
  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7))
    req.uid = decoded.uid
    req.email = decoded.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid auth token' })
  }
}
