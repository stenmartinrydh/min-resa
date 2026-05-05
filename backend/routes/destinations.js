import { Router } from 'express'
import { db } from '../lib/firebase.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const destinationsRouter = Router()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

function buildPrompt(destination, country, dates, prefs) {
  const mat = prefs.mat || {}
  const dryck = prefs.dryck || {}
  const utflykter = prefs.utflykter || {}
  const strandar = prefs.strandar || {}
  const transport = prefs.transport || {}
  const shopping = prefs.shopping || {}
  const boende = prefs.boende || {}

  const dateStr = dates?.from && dates?.to ? `${dates.from} – ${dates.to}` : 'okänt datum'

  return `Du är en erfaren reseexpert med djup kunskap om ${destination}, ${country}.
Skapa en detaljerad, personlig reseguide för en resa till ${destination} under ${dateStr}.

Resenärens preferenser:
- Mat & restauranger: kökstilar=${(mat.koksstilar || []).join(', ') || 'inga'}, budget=${mat.budget || 'medel'}, kosthänsyn=${(mat.kost || []).join(', ') || 'inga'}
- Dryck & uteliv: typer=${(dryck.typer || []).join(', ') || 'inga'}, stämning=${dryck.stamning || 'avkopplande'}
- Utflykter & aktiviteter: typer=${(utflykter.typer || []).join(', ') || 'inga'}, tempo=${utflykter.tempo || 'lugnt'}
- Stränder & vatten: strandtyp=${(strandar.strandtyp || []).join(', ') || 'inga'}, aktiviteter=${(strandar.aktiviteter || []).join(', ') || 'inga'}
- Transport: preferenser=${(transport.preferenser || []).join(', ') || 'inga'}
- Shopping: typer=${(shopping.typer || []).join(', ') || 'inga'}, budget=${shopping.budget || 'medel'}
- Boende: typ=${(boende.typ || []).join(', ') || 'inga'}, standard=${boende.standard || 'medel'}, önskemål=${(boende.onskemål || []).join(', ') || 'inga'}

Svara ENBART med ett JSON-objekt (ingen markdown, ingen förklaring) med exakt denna struktur:
{
  "sammanfattning": "2-3 meningar om destinationen anpassat till resenärens profil",
  "sektioner": {
    "mat": { "rubrik": "Mat & restauranger", "intro": "1-2 meningar", "tips": ["konkret tip 1", "konkret tip 2", "konkret tip 3", "konkret tip 4", "konkret tip 5"] },
    "dryck": { "rubrik": "Dryck & uteliv", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3", "tip4"] },
    "utflykter": { "rubrik": "Utflykter & aktiviteter", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"] },
    "strandar": { "rubrik": "Stränder & vatten", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3", "tip4"] },
    "transport": { "rubrik": "Transport & förflyttning", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3"] },
    "shopping": { "rubrik": "Shopping & marknader", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3", "tip4"] },
    "boende": { "rubrik": "Boende & hotell", "intro": "1-2 meningar", "tips": ["tip1", "tip2", "tip3", "tip4"] }
  }
}

Skriv på svenska. Var konkret: nämn riktiga namn på restauranger, stränder, hotell, marknader och sevärdheter i ${destination}. Anpassa varje sektion till resenärens preferenser.`
}

destinationsRouter.get('/', async (req, res, next) => {
  try {
    const snap = await db.collection('users').doc(req.uid).collection('destinations').orderBy('createdAt', 'desc').get()
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (err) {
    next(err)
  }
})

destinationsRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await db.collection('users').doc(req.uid).collection('destinations').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Hittades inte' })
    res.json({ id: doc.id, ...doc.data() })
  } catch (err) {
    next(err)
  }
})

destinationsRouter.post('/generate', async (req, res, next) => {
  try {
    const { name, country, dates } = req.body
    if (!name) return res.status(400).json({ error: 'Destinationsnamn krävs' })

    const prefsDoc = await db.collection('users').doc(req.uid).collection('data').doc('preferences').get()
    const prefs = prefsDoc.exists ? prefsDoc.data() : {}

    const destRef = db.collection('users').doc(req.uid).collection('destinations').doc()
    await destRef.set({
      name,
      country: country || '',
      dates: dates || {},
      status: 'pending',
      createdAt: new Date(),
    })

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(name, country || '', dates, prefs) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })

    const raw = result.response.text()
    let guide
    try {
      guide = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Gemini returnerade ogiltigt JSON')
      guide = JSON.parse(match[0])
    }

    await destRef.update({ status: 'generated', guide, generatedAt: new Date() })
    res.json({ id: destRef.id })
  } catch (err) {
    next(err)
  }
})

destinationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await db.collection('users').doc(req.uid).collection('destinations').doc(req.params.id).delete()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
