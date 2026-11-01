const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"];
const PROMPT = "Du agerar som ekologisk ink\u00f6pskontrollant f\u00f6r en Debio-godk\u00e4nd g\u00e5rd i Norge och ska alltid godk\u00e4nna eller underk\u00e4nna varan. Titta p\u00e5 fotot av etiketten och avg\u00f6r f\u00f6rst varans typ. A) Livsmedel eller ekologisk produkt som s\u00e4ljs som ekologisk: kontrollera att ett ekologiskt m\u00e4rke finns (Debios \u00d8-merke, EU:s ekologiska blad, eller Demeter) samt varum\u00e4rke/producent och kontrollkod/sp\u00e5rbarhetskod. B) Driftsmedel eller fodermedel f\u00f6r bruk p\u00e5 g\u00e5rden (t.ex. saltsten/mineralsalt, kalk, sp\u00e5r\u00e4mnen, mineralsk tillskott, fodertillskott): s\u00e5dana varor beh\u00f6ver INTE n\u00e5got ekologiskt m\u00e4rke. Kontrollera i st\u00e4llet mot Debios driftsmiddelsregister och f\u00f6rordning (EU) 2021/1165: mineraler, sp\u00e5r\u00e4mnen och salt \u00e4r generellt till\u00e5tna driftsmedel, och etikettext som 'godkjent for \u00f8kologisk produksjon', 'kan brukes i \u00f8kologisk produksjon' eller en h\u00e4nvisning till ekologisk f\u00f6rordning (t.ex. EF 834/2007) styrker att \u00e4mnet \u00e4r till\u00e5tet. Godk\u00e4nn s\u00e5dana varor n\u00e4r producenten anges p\u00e5 etiketten; underk\u00e4nn bara om \u00e4mnet uttryckligen \u00e4r f\u00f6rbjudet eller inneh\u00e5ller syntetiska tillsatser som inte \u00e4r till\u00e5tna i ekologisk produktion. B\u00f6rja svaret med raden BED\u00d6MING: GODK\u00c4ND eller BED\u00d6MING: UNDERK\u00c4ND, f\u00f6ljt av h\u00f6gst 5 meningar motivering p\u00e5 svenska.";

function extractInteractionsText(data) {
  if (Array.isArray(data.model_output)) {
    for (const step of data.model_output) {
      const parts = step.content && step.content.parts;
      if (Array.isArray(parts)) {
        const text = parts.map(p => p.text || "").join("");
        if (text.trim()) return text;
      }
    }
  }
  return (data.outputText || data.output_text || "").toString();
}

function extractGenerateContentText(data) {
  return data.candidates && data.candidates[0] && data.candidates[0].content.parts.map(p => p.text).join("") || "";
}

async function callGemini(key, imageBase64, mimeType) {
  const lastErrors = [];
  const attempts = [
    {
      name: "interactions",
      url: "https://generativelanguage.googleapis.com/v1beta/interactions",
      build: model => ({ model, input: [
        { type: "image", data: imageBase64, mime_type: mimeType },
        { type: "text", text: PROMPT }
      ] }),
      extract: extractInteractionsText
    },
    {
      name: "generateContent",
      build: model => ({ contents: [{ parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: PROMPT }
      ] }] }),
      extract: extractGenerateContentText
    }
  ];
  for (const att of attempts) {
    for (const model of MODELS) {
      for (let tryNo = 0; tryNo < 2; tryNo++) {
        const url = att.name === "interactions"
          ? att.url
          : "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify(att.build(model))
          });
          const data = await res.json();
          if (!res.ok) {
            const msg = (data.error && data.error.message) || String(res.status);
            lastErrors.push(att.name + "/" + model + ": " + msg);
            const retryable = [400, 404, 429, 500, 502, 503, 504].includes(res.status);
            if (!retryable) break;
            if (tryNo === 0) {
              await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
              continue;
            }
            break;
          }
          const text = att.extract(data);
          if (text && text.trim()) return text.trim();
          lastErrors.push(att.name + "/" + model + ": tomt svar");
          break;
        } catch (err) {
          lastErrors.push(att.name + "/" + model + ": " + String(err && err.message || err));
          break;
        }
      }
    }
  }
  throw new Error(lastErrors.join(" | "));
}

exports.analyzePhoto = onCall({ cors: true, maxInstances: 10, timeoutSeconds: 120 }, async req => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Du m\u00e5ste vara inloggad f\u00f6r att anv\u00e4nda AI-analys.");
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new HttpsError("failed-precondition", "Servern har ingen Gemini-nyckel konfigurerad. L\u00e4gg till GEMINI_API_KEY i Firebase (milj\u00f6variabel f\u00f6r funktionen).");
  }
  const imageBase64 = req.data && req.data.imageBase64;
  const mimeType = req.data && req.data.mimeType;
  if (typeof imageBase64 !== "string" || !imageBase64 || !/^[a-zA-Z0-9+/=]+$/.test(imageBase64.slice(0, 100))) {
    throw new HttpsError("invalid-argument", "Ogiltigt bildformat.");
  }
  if (imageBase64.length > 8 * 1024 * 1024) {
    throw new HttpsError("invalid-argument", "Bilden \u00e4r f\u00f6r stor.");
  }
  const safeMime = /^(image\/(jpeg|png|webp|heic|heif))$/.test(mimeType || "") ? mimeType : "image/jpeg";
  try {
    const text = await callGemini(key, imageBase64, safeMime);
    return { ok: true, text };
  } catch (err) {
    logger.error("Gemini-analys misslyckades", { error: String(err && err.message || err) });
    throw new HttpsError("internal", "AI-analysen misslyckades (tj\u00e4nsten kan vara \u00f6verbelastad \u2013 f\u00f6rs\u00f6k igen om en stund). Detalj: " + String(err && err.message || err).slice(0, 200));
  }
});
