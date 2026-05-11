import { Router } from 'express'
import { db } from '../lib/firebase.js'
import { Mistral } from '@mistralai/mistralai'

export const destinationsRouter = Router()

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY, timeoutMs: 300_000 })

function arr(v) { return Array.isArray(v) ? v : v ? [v] : [] }

const KAT_LABELS = {
  mat: 'Mat & restauranger',
  dryck: 'Dryck & uteliv',
  utflykter: 'Utflykter & aktiviteter',
  strandar: 'Stränder & vatten',
  transport: 'Transport & förflyttning',
  shopping: 'Shopping & marknader',
  boende: 'Boende & hotell',
}

const TAGS_LIST = '["naturvin","vegetariskt","veganskt","barnvänligt","utomhusservering","utsikt","historisk","bokning_krävs","kontantfritt","lokalt_ägd","halal","budget","lyxigt","natteliv","frukost","lunch","middag","fika","aktiv","avkopplande"]'

function buildCategoryPrompt(destination, country, dates, prefs, katId, excludedNames) {
  const dateStr = dates?.from && dates?.to ? `${dates.from} – ${dates.to}` : null
  const countryStr = country ? `, ${country}` : ''
  const label = KAT_LABELS[katId] || katId
  const katPrefs = prefs[katId] || {}
  const prefParts = []
  Object.entries(katPrefs).forEach(([k, v]) => {
    if (k === 'fritext') return
    const vals = arr(v)
    if (vals.length) prefParts.push(`${k}: ${vals.join(', ')}`)
  })
  if (katPrefs.fritext) prefParts.push(`övrigt: ${katPrefs.fritext}`)
  const prefStr = prefParts.length ? prefParts.join(' | ') : 'inga specifika preferenser'
  const excludeStr = excludedNames.length
    ? `\nUndvik dessa platser (redan visade eller borttagna): ${excludedNames.join(', ')}`
    : ''

  return `Du är en lokal invånare i ${destination}${countryStr} — bosatt där i många år och skriver reseguider på svenska för en oberoende reseblogg. Du föraktar turistfällor och vet precis vilka ställen som faktiskt håller vad de lovar.

Generera nya tips för kategorin "${label}" för en resa till ${destination}${countryStr}${dateStr ? ` under ${dateStr} — anpassa efter säsongen: öppettider, råvaror i säsong, lokala evenemang, klimat` : ''}.

Resenärens preferenser för ${label}: ${prefStr}${excludeStr}

DEFINITION "lokalt & icke-turistigt": meny på lokalt språk, majoriteten av gästerna är lokalbor på vardagar, inga reklamskyltar utanför på engelska, inte bland de tre översta TripAdvisor-träffarna.

Svara ENBART med ett giltigt JSON-objekt (dubbla citattecken, inga trailing commas, inga kommentarer) med exakt denna struktur:
{
  "tips": [
    {
      "namn": "Platsens namn",
      "beskrivning": "3-4 meningar om stället och varför det passar resenären baserat på deras preferenser",
      "adress": "Gatuadress, ${destination}",
      "lat": null,
      "lng": null,
      "dolda_parlan": null,
      "tags": ["tag1", "tag2"],
      "pris": "€€",
      "besokstips": "Praktiskt råd: när, vad, om man behöver boka",
      "webbplats": null,
      "oppettider": "Mån-fre 09:00-18:00 eller null om okänt",
      "bokning_rekommenderas": false
    }
  ]
}

DOLDA PÄRLOR: "dolda_parlan" är null för alla tips utom max 2 verkliga gömda pärlor per kategori — platser lokalbor älskar men turister sällan hittar. null (inte tom sträng) för övriga.
KOORDINATER: Om du inte med hög säkerhet vet exakta koordinater, sätt lat och lng till null. Det är ALLTID bättre att returnera null än att gissa — en felaktig pin är värre än ingen pin. Ange aldrig 0.0.
TAGS: välj max 4 relevanta taggar från listan: ${TAGS_LIST}
WEBBPLATS: officiell hemsida eller Instagram-handle (@...). INTE TripAdvisor, Google Maps eller bokningssajter. null om osäker.
PRIS: använd exakt ett av dessa värden: "€", "€€", "€€€", "€€€€" eller null om inte relevant.
Inkludera 4-8 tips beroende på vad destinationen faktiskt erbjuder — tvinga inte fram tips som inte håller måttet. Skriv på svenska.`
}

function buildPrompt(destination, country, dates, prefs) {
  const mat = prefs.mat || {}
  const dryck = prefs.dryck || {}
  const utflykter = prefs.utflykter || {}
  const strandar = prefs.strandar || {}
  const transport = prefs.transport || {}
  const shopping = prefs.shopping || {}
  const boende = prefs.boende || {}

  const dateStr = dates?.from && dates?.to ? `${dates.from} – ${dates.to}` : null
  const countryStr = country ? `, ${country}` : ''

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

  return `Du är en lokal invånare i ${destination}${countryStr} — bosatt där i många år och skriver reseguider på svenska för en oberoende reseblogg. Du föraktar turistfällor och vet precis vilka ställen som faktiskt håller vad de lovar.

Destination: ${destination}${countryStr}
${dateStr ? `Resedatum: ${dateStr} — anpassa tipsen efter säsongen: vilka platser är öppna, vad som är i säsong (råvaror, evenemang), klimatanpassningar och eventuella lokala helgdagar under perioden.` : ''}

Resenärens preferenser:
${prefRader}

DEFINITION "lokalt & icke-turistigt": meny på lokalt språk, majoriteten av gästerna är lokalbor på vardagar, inga reklamskyltar utanför på engelska, inte bland de tre översta TripAdvisor-träffarna.

EXEMPEL på ett välformat tips:
{
  "namn": "Osteria del Vicolo",
  "beskrivning": "Familjeägt sedan 1968, menyn skrivs på tavlan varje morgon efter vad som kommit in från marknaden. Stämningen är bullrig och vardaglig — lokalborna ockuperar varje bord vid lunch. Perfekt för dig som vill äta äkta lokal mat utan turistpris.",
  "adress": "Via del Mercato 14, ${destination}",
  "lat": null,
  "lng": null,
  "dolda_parlan": "Stammarna ber alltid om dagsrätten — den syns inte på tavlan men är alltid det bästa på bordet.",
  "tags": ["lokalt_ägd", "lunch", "budget"],
  "pris": "€€",
  "besokstips": "Kom 12:00–13:00, det fylls snabbt. Ingen bokning — dyk bara upp.",
  "webbplats": null,
  "oppettider": "Mån–lör 12:00–15:00, 19:00–22:30. Stängt söndag.",
  "bokning_rekommenderas": false
}

Svara ENBART med ett giltigt JSON-objekt (dubbla citattecken, inga trailing commas, inga kommentarer) med exakt denna struktur:
{
  "sammanfattning": "4-5 meningar om destinationen, anpassat till resenärens profil och resans tidpunkt",
  "sektioner": {
    "mat": {
      "rubrik": "Mat & restauranger",
      "intro": "3-4 meningar om matscenen i ${destination}, anpassat till preferenserna",
      "tips": [
        {
          "namn": "Restaurangens namn",
          "beskrivning": "3-4 meningar: vad som serveras, atmosfären, vad som gör stället unikt och varför det matchar resenärens preferenser",
          "adress": "Gatuadress, ${destination}",
          "lat": null,
          "lng": null,
          "dolda_parlan": null,
          "tags": ["tag1", "tag2"],
          "pris": "€€",
          "besokstips": "Praktiskt råd: bästa tid, vad man ska beställa, om bokning krävs",
          "webbplats": null,
          "oppettider": "Mån-fre 12:00-22:00 eller null om okänt",
          "bokning_rekommenderas": false
        }
      ]
    },
    "dryck": { "rubrik": "Dryck & uteliv", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] },
    "utflykter": { "rubrik": "Utflykter & aktiviteter", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] },
    "strandar": { "rubrik": "Stränder & vatten", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] },
    "transport": { "rubrik": "Transport & förflyttning", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] },
    "shopping": { "rubrik": "Shopping & marknader", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] },
    "boende": { "rubrik": "Boende & hotell", "intro": "3-4 meningar", "tips": [ { "namn": "", "beskrivning": "", "adress": "", "lat": null, "lng": null, "dolda_parlan": null, "tags": [], "pris": "€€", "besokstips": "", "webbplats": null, "oppettider": null, "bokning_rekommenderas": false } ] }
  }
}

DOLDA PÄRLOR: "dolda_parlan" är null för alla tips utom max 2 verkliga gömda pärlor per kategori — platser lokalbor älskar men turister sällan hittar. null (inte tom sträng) för övriga.
KOORDINATER: Om du inte med hög säkerhet vet exakta koordinater, sätt lat och lng till null. Det är ALLTID bättre att returnera null än att gissa — en felaktig pin på kartan är värre än ingen pin. Ange aldrig 0.0.
TAGS: välj max 4 relevanta taggar från listan: ${TAGS_LIST}
WEBBPLATS: officiell hemsida eller Instagram-handle (@...). INTE TripAdvisor, Google Maps eller bokningssajter. null om osäker.
PRIS: använd exakt ett av dessa värden: "€", "€€", "€€€", "€€€€" eller null om inte relevant.
ANTAL TIPS: inkludera 4-8 tips per sektion beroende på vad destinationen faktiskt erbjuder — tvinga inte fram tips som inte håller måttet.
Skriv på svenska. Var konkret och personlig — visa tydligt hur varje tips kopplar till resenärens preferenser.`
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

destinationsRouter.delete('/:id/tips/:katId/:index', async (req, res, next) => {
  try {
    const { id, katId, index } = req.params
    const idx = parseInt(index)
    const ref = db.collection('users').doc(req.uid).collection('destinations').doc(id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Hittades inte' })

    const data = doc.data()
    const tips = data.guide?.sektioner?.[katId]?.tips || []
    const deletedTip = tips[idx]
    if (!deletedTip) return res.status(404).json({ error: 'Tips hittades inte' })

    const newTips = tips.filter((_, i) => i !== idx)
    const deletedNames = data.deletedTips?.[katId] || []

    // Justera favorit-index: ta bort det raderade, flytta ned högre index
    const favoriter = (data.favoriter || [])
      .filter(f => f !== `${katId}-${idx}`)
      .map(f => {
        const [fKat, fIdx] = f.split('-')
        if (fKat === katId && parseInt(fIdx) > idx) return `${fKat}-${parseInt(fIdx) - 1}`
        return f
      })

    await ref.update({
      [`guide.sektioner.${katId}.tips`]: newTips,
      [`deletedTips.${katId}`]: [...deletedNames, deletedTip.namn],
      favoriter,
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

destinationsRouter.post('/:id/sektioner/:katId/regenerate', async (req, res, next) => {
  try {
    const { id, katId } = req.params
    const ref = db.collection('users').doc(req.uid).collection('destinations').doc(id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Hittades inte' })

    const { name, country, dates, deletedTips = {} } = doc.data()
    const prefsDoc = await db.collection('users').doc(req.uid).collection('data').doc('preferences').get()
    const prefs = prefsDoc.exists ? prefsDoc.data() : {}

    const excludedNames = deletedTips[katId] || []
    console.log(`[regenerate] Kategori "${katId}" för "${name}", exkluderar: [${excludedNames.join(', ')}]`)

    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: buildCategoryPrompt(name, country || '', dates, prefs, katId, excludedNames) }],
      responseFormat: { type: 'json_object' },
    })

    const parsed = JSON.parse(result.choices[0].message.content)
    const newTips = parsed.tips || []

    await ref.update({ [`guide.sektioner.${katId}.tips`]: newTips })
    console.log(`[regenerate] Klart — ${newTips.length} nya tips för "${katId}"`)
    res.json({ ok: true })
  } catch (err) {
    console.error(`[regenerate] Fel: ${err.message}`)
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
