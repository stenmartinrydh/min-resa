import { Router } from 'express'
import { db } from '../lib/firebase.js'
import { Mistral } from '@mistralai/mistralai'

export const destinationsRouter = Router()

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY })

function arr(v) { return Array.isArray(v) ? v : v ? [v] : [] }

function buildPrompt(destination, country, dates, prefs) {
  const mat = prefs.mat || {}
  const dryck = prefs.dryck || {}
  const utflykter = prefs.utflykter || {}
  const strandar = prefs.strandar || {}
  const transport = prefs.transport || {}
  const shopping = prefs.shopping || {}
  const boende = prefs.boende || {}

  const dateStr = dates?.from && dates?.to ? `${dates.from} – ${dates.to}` : 'okänt datum'

  function prefRad(label, kat) {
    const delar = []
    Object.entries(kat).forEach(([k, v]) => {
      if (k === 'fritext') return
      const vals = arr(v)
      if (vals.length) delar.push(`${k}: ${vals.join(', ')}`)
    })
    if (kat.fritext) delar.push(`övrigt: ${kat.fritext}`)
    return delar.length ? `- ${label}: ${delar.join(' | ')}` : ''
  }

  const prefRader = [
    prefRad('Mat & restauranger', mat),
    prefRad('Dryck & uteliv', dryck),
    prefRad('Utflykter & aktiviteter', utflykter),
    prefRad('Stränder & vatten', strandar),
    prefRad('Transport', transport),
    prefRad('Shopping', shopping),
    prefRad('Boende', boende),
  ].filter(Boolean).join('\n') || '- Inga preferenser angivna'

  return `Du är en erfaren reseexpert med djup lokalkännedom om ${destination}${country ? ', ' + country : ''}.
Skapa en utförlig, personlig reseguide för en resa till ${destination} under ${dateStr}.

Resenärens preferenser:
${prefRader}

VIKTIGT: Prioritera "gömda pärlor" — platser och upplevelser som är välkända bland lokalborna men inte uppenbara för vanliga turister. Undvik de mest uppenbara turistfällorna om det finns bättre alternativ.

Svara ENBART med ett JSON-objekt (ingen markdown, ingen förklaring) med exakt denna struktur:
{
  "sammanfattning": "4-5 meningar som beskriver destinationen djupgående, anpassat till resenärens profil och tidpunkt för resan",
  "sektioner": {
    "mat": {
      "rubrik": "Mat & restauranger",
      "intro": "3-4 meningar om matscenen i ${destination}, anpassat till preferenserna",
      "tips": [
        {
          "namn": "Restaurangens namn",
          "beskrivning": "3-4 meningar: vad som serveras, atmosfären, vad som gör stället unikt, varför det passar resenären",
          "adress": "Gatuadress, ${destination}",
          "lat": 0.0,
          "lng": 0.0,
          "dolda_parlan": "1-2 meningar om varför detta är en gömd pärla och inte en turistfälla",
          "tags": ["tag1", "tag2", "tag3"],
          "pris": "€/€€/€€€/€€€€",
          "besokstips": "Praktiskt råd: när man ska gå, vad man ska beställa, om man behöver boka",
          "webbplats": "Officiell webbplats-URL OM du är helt säker på att URL:en är korrekt och aktiv — annars exakt null (inte en gissning)"
        }
      ]
    },
    "dryck": { "rubrik": "Dryck & uteliv", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] },
    "utflykter": { "rubrik": "Utflykter & aktiviteter", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] },
    "strandar": { "rubrik": "Stränder & vatten", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] },
    "transport": { "rubrik": "Transport & förflyttning", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] },
    "shopping": { "rubrik": "Shopping & marknader", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] },
    "boende": { "rubrik": "Boende & hotell", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": 0.0, "lng": 0.0, "dolda_parlan": "", "tags": [], "pris": "", "besokstips": "", "webbplats": "" } ] }
  }
}

Inkludera 8-10 tips per sektion. Fyll i korrekta latitud/longitud-koordinater för varje plats. Skriv på svenska. Var konkret och personlig.`
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
  let destRef
  try {
    const { name, country, dates } = req.body
    if (!name) return res.status(400).json({ error: 'Destinationsnamn krävs' })

    console.log(`[generate] Startar för "${name}" (uid: ${req.uid})`)

    const prefsDoc = await db.collection('users').doc(req.uid).collection('data').doc('preferences').get()
    const prefs = prefsDoc.exists ? prefsDoc.data() : {}
    console.log(`[generate] Preferenser: ${prefsDoc.exists ? 'hittade' : 'inga sparade'}`)

    destRef = db.collection('users').doc(req.uid).collection('destinations').doc()
    await destRef.set({
      name,
      country: country || '',
      dates: dates || {},
      status: 'pending',
      createdAt: new Date(),
    })
    console.log(`[generate] Dokument sparat (id: ${destRef.id}), anropar Gemini…`)

    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: buildPrompt(name, country || '', dates, prefs) }],
      responseFormat: { type: 'json_object' },
    })

    const raw = result.choices[0].message.content
    console.log(`[generate] Mistral svarade (${raw.length} tecken)`)

    let guide
    try {
      guide = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Gemini returnerade ogiltigt JSON')
      guide = JSON.parse(match[0])
    }

    await destRef.update({ status: 'generated', guide, generatedAt: new Date() })
    console.log(`[generate] Klart — ${name} (id: ${destRef.id})`)
    res.json({ id: destRef.id })
  } catch (err) {
    console.error(`[generate] Fel: ${err.message}`)
    await destRef?.update({ status: 'error' }).catch(() => {})

    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Too Many Requests')) {
      return res.status(429).json({ error: 'AI-tjänsten är tillfälligt överbelastad. Vänta en stund och försök igen.' })
    }
    next(err)
  }
})

destinationsRouter.put('/:id/favoriter', async (req, res, next) => {
  try {
    const { favoriter } = req.body
    if (!Array.isArray(favoriter)) return res.status(400).json({ error: 'favoriter måste vara en array' })
    await db.collection('users').doc(req.uid).collection('destinations').doc(req.params.id).update({ favoriter })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

destinationsRouter.post('/:id/checklist', async (req, res, next) => {
  try {
    const doc = await db.collection('users').doc(req.uid).collection('destinations').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Hittades inte' })
    const { name, country } = doc.data()

    const prompt = `Du är en erfaren reseexpert. Skapa en praktisk förberedelse-checklista för en resa till ${name}${country ? ', ' + country : ''}.

Svara ENBART med ett JSON-objekt med exakt denna struktur:
{
  "kategorier": [
    { "rubrik": "Dokument", "items": ["..."] },
    { "rubrik": "Hälsa & säkerhet", "items": ["..."] },
    { "rubrik": "Pengar & betalning", "items": ["..."] },
    { "rubrik": "Kläder & packning", "items": ["..."] },
    { "rubrik": "Boende & transport", "items": ["..."] },
    { "rubrik": "Teknik & kommunikation", "items": ["..."] }
  ]
}

Inkludera 5-8 konkreta, actionbara punkter per kategori. Anpassa till destinationen (t.ex. visumkrav, klimat, valuta). Skriv på svenska.`

    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
    })

    const checklist = JSON.parse(result.choices[0].message.content)
    await db.collection('users').doc(req.uid).collection('destinations').doc(req.params.id).update({ checklist })
    res.json({ ok: true })
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
