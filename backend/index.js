import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authenticate } from './middleware/auth.js'
import { requestLogger } from './middleware/logger.js'
import { preferencesRouter } from './routes/preferences.js'
import { destinationsRouter } from './routes/destinations.js'

const app = express()
const PORT = process.env.PORT || 3010

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5175',
  'http://localhost:5173',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true)
    else {
      console.warn(`[CORS] Blocked origin: ${origin}`)
      cb(new Error(`CORS: ${origin} not allowed`))
    }
  },
}))
app.use(express.json())
app.use(requestLogger)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/preferences', authenticate, preferencesRouter)
app.use('/api/destinations', authenticate, destinationsRouter)

app.use((err, req, res, next) => {
  const status = err.status || 500
  console.error(`[ERROR] ${err.message}`)
  if (status >= 500) console.error(err.stack)
  res.status(status).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n[min-resa] Backend startar på port ${PORT}`)
  console.log(`[min-resa] Tillåtna origins: ${allowedOrigins.join(', ')}\n`)
})
