# min-resa

AI-driven app som genererar personliga resmålsguider baserat på användarens preferenser. Användaren anger destination och resdatum — Mistral AI skapar en guide med 8–10 tips per kategori (mat, dryck, utflykter, stränder, transport, shopping, boende). Alla texter är på svenska.

## Starta dev-miljön

```bash
# Backend (port 3010)
cd /workspace/min-resa/backend && npm run dev

# Frontend (port 5175)
cd /workspace/min-resa/frontend && npm run dev -- --host
```

Healthcheck backend: `curl http://localhost:3010/health`

## Stack

| Del | Teknik |
|-----|--------|
| Frontend | React 18, Vite, Tailwind CSS v4, TanStack Query, React Router v6 |
| Backend | Node.js, Express 5, ES modules (`"type": "module"`) |
| Auth | Firebase Authentication (e-post/lösenord) |
| Databas | Firestore (Firebase) |
| AI | Mistral AI (`mistral-small-latest`), JSON-mode |
| Ikoner | lucide-react |

## Filstruktur

```
min-resa/
├── backend/
│   ├── index.js                  # Express-server, port 3010
│   ├── middleware/
│   │   ├── auth.js               # Verifierar Firebase ID-token → req.uid
│   │   └── logger.js             # Request-loggning
│   ├── routes/
│   │   ├── destinations.js       # GET/POST/DELETE destinations + AI-generering
│   │   └── preferences.js        # GET/PUT användarpreferenser
│   └── lib/firebase.js           # Firebase Admin SDK-init
│
└── frontend/src/
    ├── App.jsx                   # Routes
    ├── components/
    │   ├── Layout.jsx            # Header + bottom nav (Hem / + / Preferenser)
    │   ├── CategorySection.jsx   # Renderar tips-kort för en kategori
    │   └── ProtectedRoute.jsx    # Redirect till /login om ej inloggad
    ├── contexts/AuthContext.jsx  # Firebase auth-state, login/logout/register
    ├── lib/
    │   ├── api.js                # Fetch-wrapper (lägger till Firebase Bearer-token)
    │   ├── firebase.js           # Firebase Web SDK-init
    │   └── queryClient.js        # TanStack Query-klient
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Dashboard.jsx         # Lista sparade resor
        ├── NewDestination.jsx    # Formulär: destination, land, datum → POST generate
        ├── DestinationGuide.jsx  # Flikar per kategori + översikt
        └── Preferences.jsx       # Chip-baserat preferensformulär
```

## API-routes (alla kräver Firebase Bearer-token)

| Metod | Route | Beskrivning |
|-------|-------|-------------|
| GET | `/api/destinations` | Hämta alla destinationer för inloggad användare |
| GET | `/api/destinations/:id` | Hämta en destination |
| POST | `/api/destinations/generate` | Skapa destination + kör Mistral AI |
| DELETE | `/api/destinations/:id` | Ta bort destination |
| GET | `/api/preferences` | Hämta preferenser |
| PUT | `/api/preferences` | Spara preferenser |

## Firestore-struktur

```
users/{uid}/
  destinations/{destId}     # name, country, dates, status, guide, createdAt
  data/preferences          # { mat, dryck, utflykter, strandar, transport, shopping, boende }
```

`status` på en destination: `pending` → `generated` | `error`

## AI-guidens JSON-format

Mistral returnerar ett JSON-objekt med:
- `sammanfattning` — 4–5 meningar om destinationen
- `sektioner` — objekt med nycklarna: `mat`, `dryck`, `utflykter`, `strandar`, `transport`, `shopping`, `boende`

Varje sektion har `rubrik`, `intro` och `tips` (array med 8–10 objekt). Varje tips-objekt:
```json
{
  "namn": "",
  "beskrivning": "",
  "adress": "",
  "lat": 0.0,
  "lng": 0.0,
  "dolda_parlan": "",
  "tags": [],
  "pris": "€/€€/€€€/€€€€",
  "besokstips": "",
  "webbplats": "https://..."
}
```

`webbplats` är officiell URL eller tom sträng/null om ingen finns.

## Frontend-detaljer

- **Auth-flödet**: Firebase Web SDK i `AuthContext`. `api.js` hämtar ID-token automatiskt inför varje request.
- **Geolokalisering**: `DestinationGuide` hämtar användarens position för att visa avstånd till varje tips.
- **Bottom nav**: Tre knappar — Hem, stor blå + (ny resa), Preferenser.
- **Preferensformulär**: Chip-pickers per kategori (fällbara), fritext per kategori. Sparas till Firestore via PUT.
- **Gömd pärla**: Tips med `dolda_parlan` visas med 💎-badge och gul bakgrundsfärg.

## Git

```
origin: https://github.com/stenmartinrydh/min-resa
```

## Miljövariabler

`backend/.env`: `PORT`, `CORS_ORIGIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `MISTRAL_API_KEY`

`frontend/.env`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

Firebase-projektet heter `bonsai-tracker-3769e` (delat med bonsai-tracker-appen).
