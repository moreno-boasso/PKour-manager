# PKour Manager (frontend)

Gestionale Angular per PKour.  
Questo progetto usa un backend dedicato locale in `PKour-be/manager-be`.

## Architettura locale

- `PKour-manager` -> frontend (Angular), default `http://localhost:3000`
- `PKour-be/manager-be` -> backend manager (Node/Express), consigliato `http://localhost:3001`

Usare due porte diverse evita conflitti e rende più chiaro il debug.

## Prerequisiti

- Node.js 20+ (consigliato)
- npm
- Accesso al database Neon usato dal backend manager

## Setup una tantum

### 1) Frontend manager (`PKour-manager`)

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-manager"
cp .env.example .env
npm install
```

Configura `.env`:

```env
PKOUR_API_BASE_URL=http://localhost:3001/api
PKOUR_TRICKS_WRITE_ENDPOINT=/tricks/upsert-local
PKOUR_TRICKS_DELETE_ENDPOINT=/tricks/delete-local
LOCAL_TOOL_SECRET=stesso-valore-del-backend-manager
```

### 2) Backend manager (`PKour-be/manager-be`)

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-be/manager-be"
cp .env.example .env
npm install
```

Configura `.env`:

```env
PORT=3001
NEON_DATABASE_URL=metti-qui-connessione-neon
LOCAL_TOOL_SECRET=stesso-valore-del-frontend-manager
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Avvio giornaliero (frontend + backend insieme)

Apri **2 terminali**.

### Terminale A - Backend manager

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-be/manager-be"
npm run dev
```

Output atteso:

- `Manager backend running on port 3001`

### Terminale B - Frontend manager

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-manager"
npm start
```

Apri nel browser:

- `http://localhost:3000`

## Verifica rapida

1. Backend health:
   - `http://localhost:3001/api/health`
2. Da UI manager:
   - apertura pagina senza errori
   - caricamento lista tricks
   - create/update/delete funzionanti

## Riavvio rapido

Quando riapri il progetto:

```bash
# Terminale A
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-be/manager-be"
npm run dev

# Terminale B
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-manager"
npm start
```

Se cambi uno `.env`, riavvia il relativo servizio.

## Build

### Frontend manager

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-manager"
npm run build
```

### Backend manager

```bash
cd "/Users/morenocodeploy/Desktop/Progetti Personali/pkour/PKour-be/manager-be"
npm run build
```

## Troubleshooting

- `EADDRINUSE` su `3000` o `3001`
  - una porta è già occupata; chiudi il processo o cambia `PORT`.
- `403 Endpoint consentito solo in locale...`
  - `LOCAL_TOOL_SECRET` non coincide tra frontend e backend.
- errori CORS dal browser
  - controlla `CORS_ALLOWED_ORIGINS` nel backend manager.
- frontend parte ma non carica dati
  - verifica `PKOUR_API_BASE_URL` e che backend sia su `3001`.
