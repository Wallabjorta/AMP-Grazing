# AMP Betesflytt

En enkel app för att registrera och följa flyttningen av djur mellan betesmarker enligt adaptivt
multi-paddock-betesbruk (AMP grazing).

## Användning

Öppna `index.html` i valfri modern webbläsare – ingen installation eller server krävs.
Appen fungerar bra på mobil och surfplatta.

### Kom igång

1. **Betesmarker** – lägg till dina marker (namn och valfri storlek i hektar).
2. **Djurgrupper** – lägg till dina grupper (t.ex. "Korna, grupp A") med antal djur.
3. **Flyttningar** – registrera varje flytt: vilken grupp, från vilken mark, till vilken mark,
   datum och tid. Vid första släppet väljs "– ingen –" som från-mark.
   **Flytt inom samma mark:** välj samma mark i både "från" och "till" – det räknas som en
   flytt till ett nytt område inne i marken. Fältet "Flyttad yta (ha)" anger hur stor yta
   djuren fick (valfritt, men rekommenderas för inom-flyttar).

### Vad appen visar

- **Översikt** – vilken mark varje grupp betar just nu och hur många dagar de varit där.
- **Statistik** – flyttningar per månad, antal beten per mark, snittåterhämtning (vila)
  och totala betade dagar per mark.
- **Data** – export/import av backup (JSON) samt möjlighet att radera all data.

## Teknik

En enda fristående HTML-fil (`index.html`) utan beroenden. All data sparas lokalt i
webbläsarens `localStorage`. Ta regelbundet backup via fliken Data, eftersom lokal data
kan försvinna om webbläsardata rensas.

## Test

```bash
node test.js
```

Kör logiktester (sortering, dagsberäkningar, statistikfunktioner) mot appens kärnfunktioner.

## Deploy till Firebase Hosting

Appen är statisk och kan hostas direkt med Firebase Hosting.

### Snabbt från egen dator

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

`firebase.json` i repot pekar ut rotkatalogen som public directory. URL:en du får
(typ `https://ditt-projekt.web.app`) uppdateras vid varje `firebase deploy`.

### Automatisk deploy via GitHub Actions

Workflowen `.github/workflows/firebase-deploy.yml` deployar till Firebase Hosting vid
varje push till `main`. Konfigurera en gång:

1. Skapa ett Firebase-projekt och en Hosting-site på <https://console.firebase.google.com>.
2. Kör lokalt `firebase login:ci` och kopiera den resulterande token (behövs bara för att
   skapa servicekontot). Enklare: i Firebase-konsolen under Projektinställningar ->
   Service accounts -> "Generate new private key" fås en JSON-nyckel.
3. Lägg till följande secrets i GitHub (Settings -> Secrets and variables -> Actions):
   - `FIREBASE_SERVICE_ACCOUNT` – hela JSON-innehållet från privata nyckeln
   - `FIREBASE_PROJECT_ID` – ditt Firebase-projekt-id
4. Pusha till `main` – workflowen deployar och appen live-uppdateras.

Data sparas per webbläsare (localStorage) – se fliken Data i appen för backup/export.
