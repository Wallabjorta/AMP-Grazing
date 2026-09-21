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
