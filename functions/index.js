const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const PROMPT = "Du agerar som ekologisk ink\u00f6pskontrollant f\u00f6r Debio-varor i Norge och ska alltid godk\u00e4nna eller underk\u00e4nna varan. Titta p\u00e5 fotot av etiketten och kontrollera mot Debios krav: 1) Finns ett ekologiskt m\u00e4rke (Debios \u00d8-merke, EU:s ekologiska blad f\u00f6r importvaror, eller Demeter)? 2) Finns varum\u00e4rke/producent och en kontrollkod/sp\u00e5rbarhetskod? 3) Inneh\u00e5ller ingredienserna n\u00e5gra tillsatser eller driftsmedel som inte \u00e4r till\u00e5tna i ekologisk produktion enligt Debios driftsmiddelsregister? B\u00f6rja svaret med raden BED\u00d6MING: GODK\u00c4ND eller BED\u00d6MING: UNDERK\u00c4ND, f\u00f6ljt av h\u00f6gst 5 meningar motivering p\u00e5 svenska.";

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
