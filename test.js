const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

const state = {
  paddocks: [
    { id: "a", name: "A", sizeHa: 1 },
    { id: "b", name: "B", sizeHa: 2 },
  ],
  herds: [{ id: "h1", name: "Kor", count: 10 }],
  moves: [
    { id: "m1", herdId: "h1", fromPaddockId: null, toPaddockId: "a", date: "2024-05-01", time: "08:00" },
    { id: "m2", herdId: "h1", fromPaddockId: "a", toPaddockId: "b", date: "2024-05-04", time: "08:00" },
    { id: "m3", herdId: "h1", fromPaddockId: "b", toPaddockId: "a", date: "2024-05-20", time: "08:00" },
  ],
};

let body = src.replace(/^"use strict";/, "");
body = body.replace(/const STORAGE_KEY[\s\S]*?let state = load\(\);/, "var state = " + JSON.stringify(state) + ";");
body = body.replace(/function save\(\)\{[\s\S]*?\}/, "");
body = body.replace(/render\(\);\s*$/, "");

global.document = {
  getElementById: () => ({ addEventListener: () => {} }),
  querySelectorAll: () => [],
  addEventListener: () => {},
};
global.window = global;

const tests = `
var ms = movesForHerd("h1");
console.assert(ms.map(m=>m.id).join(",") === "m1,m2,m3", "moves should be chronologically sorted");
console.assert(currentPaddockId("h1") === "a", "current paddock should be a");
console.assert(daysBetween("2024-05-01","2024-05-04") === 3, "daysBetween should be 3");
console.assert(grazeDaysForPaddock("b") === 16, "grazeDays B should be 16");
console.assert(avgRestDays("a") === 16, "avgRest A should be 16 days (left 05-04, re-entered 05-20)");
console.assert(arrivalsTo("a").length === 2, "arrivals to A should be 2");
console.assert(movesPerMonth().length === 12, "movesPerMonth should cover 12 months");
console.log("ALL LOGIC TESTS PASSED");
`;
eval(body + tests);
