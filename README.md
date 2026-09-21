# AMP Betesflytt

En enkel app för att registrera och följa flytten av djur mellan betesmarker enligt adaptivt
multi-paddock-betesbruk (AMP grazing).

## Användning

Öppna `index.html` i valfri modern webbläsare – ingen installation eller server krävs.
Appen fungerar bra på mobil och surfplatta.

### Kom igång

1. **Betesmarker** – lägg till dina marker (namn och valfri storlek i hektar).
2. **Djurgrupper** – lägg till dina grupper (t.ex. "Korna, grupp A") med antal djur.
3. **Flyttar** – registrera varje flytt: vilken grupp, från vilken mark, till vilken mark,
   datum och tid. Vid första släppet väljs "– ingen –" som från-mark.
   **Flytt inom samma mark:** välj samma mark i både "från" och "till" – det räknas som en
   flytt till ett nytt område inne i marken. Fältet "Flyttad yta (ha)" anger hur stor yta
   djuren fick (valfritt, men rekommenderas för inom-flyttar).

### Vad appen visar

- **Översikt** – vilken mark varje grupp betar just nu och hur många dagar de varit där.
- **Statistik** – flyttar per månad, antal beten per mark, snittåterhämtning (vila)
  och totala betade dagar per mark.
- **Karta** – visa betesmarkerna på karta (OpenStreetMap). Importera ett GPX-spår
  (t.ex. från en GPS-app där du gått runt markens gräns) så ritas gränsen och
  hektaren beräknas automatiskt; markernas flyttar visas som streckade linjer mellan
  områdena och djurgruppernas aktuella position markeras. Gränser kan också ritas
  manuellt direkt på kartan.
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

## Flera användare och gårdar (login)

Appen har en inloggningssida där varje konto är en egen gård. Data lagras i Cloud Firestore
under `farms/{uid}`, så varje gårds statistik hålls helt separat. Utan konfiguration (se nedan)
körs appen i lokalt läge som tidigare, med localStorage.

### Aktivera Authentication och Firestore (engångs)

1. I Firebase-konsolen för projektet: **Build → Authentication → Get started** och aktivera
   providern **Email/Password** (Email/Password → Enable → Save).
2. **Build → Firestore Database → Create database** → välj produktion eller testläge → närmaste region.
3. **Projektinställningar → Your apps → Web (`<`/`>`)** → registrera webbappen och kopiera
   `firebaseConfig`-objektet.
4. Klistra in config-värdena i `index.html` (sök på `firebaseConfig`) – ersätt platshållarna
   `DIN_API_KEY_HÄR` osv. Committa och pusha till `main` – deployen sköter resten.
5. Lägg till en Firestore-säkerhetsregel så att bara ägaren kan läsa/skriva sin gårds data
   (Firestore → Rules):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /farms/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

Därefter: varje ny användare klickar **Skapa nytt gårdskonto** på inloggningssidan och får
en egen, helt separat gård.

Data sparas i Firestore när Firebase är konfigurerat; annars per webbläsare (localStorage) –
se fliken Data i appen för backup/export.
