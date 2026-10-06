# AGENTS.md

Vägledning för AI-agenter och bidragsgivare som arbetar i detta repo.

## Projektöversikt

AMP Betesflytt – en webbapp för att registrera och följa flytt av djur mellan
betesmarker enligt adaptivt multi-paddock-betesbruk (AMP grazing).

Appen består i princip av en enda fristående fil: `index.html` (HTML + CSS +
JavaScript, ingen byggkedja). Till den kommer:

- `functions/` – Firebase Cloud Functions
- `firestore.rules`, `firebase.json`, `.firebaserc` – Firebase-konfiguration
- `test.js` – logiktester som körs med Node
- `.github/workflows/` – Firebase Hosting-deploy vid push till `main`

## Arkitektur

- All UI renderas i `index.html` via `render()` som fyller `<section>`-element
  (en per flik). Flikar styrs av `showTab(tab)` och `data-tab`-knappar i `nav`.
- Kartor bygger på Leaflet 1.9.4 (CDN). Huvudkartan initieras av `initMap()`
  (`#map-canvas`); sidan "Rita flyttyta" har en egen instans via
  `initMoveAreaMap()` (`#movearea-canvas`).
- Data sparas med Firestore när Firebase är konfigurerat (`farms/{uid}`),
  annars i `localStorage`. All dataåtkomst går via `save()`/`load()`.
- Polygonytor beräknas med `polygonAreaHa()`; hektar lagras på objekten.

## Konventioner

- Språk i UI och meddelanden: svenska.
- Ingen byggkedja, inga npm-paket för klienten – ändra direkt i `index.html`.
- Följ befintlig kodstil: dubbla citattecken, semikolon, `const`/`let`,
  svenska användartexter.
- Nya knappar i renderade vyer kopplas via `data-action` och hanteras i den
  globala klicklyssnaren (`document.addEventListener("click", ...)`).
- Nya flikar/sectioner: lägg till `<section id="...">`, knapp i `nav` och
  ev. specialfall i `showTab()` (t.ex. `invalidateSize()` för Leaflet-kartor).

## Test och verifiering

Kör alltid innan du levererar:

```bash
node test.js
```

Ändringar i kartlogik går inte att enhetstesta i Node – verifiera genom att
öppna `index.html` i en webbläsare och testa flödet manuellt.

## Deploy

Push till `main` deployar automatiskt till Firebase Hosting via GitHub
Actions (kräver secrets `FIREBASE_SERVICE_ACCOUNT` och `FIREBASE_PROJECT_ID`).
Undvik därför ogenomtänkta ändringar direkt på `main` – arbeta på en gren och
öppna en PR.

## Gotchas

- `index.html` är stor (~116 KB). Använd sökning (`grep -n`) för att hitta
  rätt ställe i stället för att läsa hela filen.
- Leaflet-kartor med `hidden`-containrar måste få `invalidateSize()` efter
  att sektionen visats, annars blir kartan trasig.
- Snap-funktionen `snapPoint(latlng, map)` är karta-parameteriserad – skicka
  med rätt kartinstans för den nya flyttytkartan.
- Redigering av polygoner är avgränsad per ursprungsflik (flyttytor från
  Flyttar, betesmarker från Betesmarker) – bevara det beteendet.
