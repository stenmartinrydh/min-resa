import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authenticate } from './middleware/auth.js'
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
    else cb(new Error(`CORS: ${origin} not allowed`))
  },
}))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/preferences', authenticate, preferencesRouter)
app.use('/api/destinations', authenticate, destinationsRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`min-resa backend running on port ${PORT}`))
