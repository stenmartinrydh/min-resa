import { Router } from 'express'
import { db } from '../lib/firebase.js'

export const preferencesRouter = Router()

preferencesRouter.get('/', async (req, res, next) => {
  try {
    const doc = await db.collection('users').doc(req.uid).collection('data').doc('preferences').get()
    res.json(doc.exists ? doc.data() : {})
  } catch (err) {
    next(err)
  }
})

preferencesRouter.put('/', async (req, res, next) => {
  try {
    await db.collection('users').doc(req.uid).collection('data').doc('preferences').set(req.body, { merge: true })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
