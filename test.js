const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const src = html.match(/<script type="module">([\s\S]*)<\/script>/)[1];

function extractFn(name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) throw new Error("function not found: " + name);
  let depth = 0;
  let i = src.indexOf("{", start);
  const bodyStart = i;
  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
    i++;
  }
  throw new Error("unbalanced braces for " + name);
}

const testState = {
  paddocks: [
    { id: "a", name: "A", sizeHa: 1 },
    { id: "b", name: "B", sizeHa: 2 },
  ],
  herds: [{ id: "h1", name: "Kor", count: 10 }],
  moves: [
    { id: "m1", herdId: "h1", fromPaddockId: null, toPaddockId: "a", date: "2024-05-01", time: "08:00", sizeHa: null },
    { id: "m2", herdId: "h1", fromPaddockId: "a", toPaddockId: "b", date: "2024-05-04", time: "08:00", sizeHa: 2.5 },
    { id: "m3", herdId: "h1", fromPaddockId: "b", toPaddockId: "a", date: "2024-05-20", time: "08:00", sizeHa: 3 },
    { id: "m4", herdId: "h1", fromPaddockId: "a", toPaddockId: "a", date: "2024-05-23", time: "08:00", sizeHa: 0.5 },
    { id: "m5", herdId: "h1", fromPaddockId: "a", toPaddockId: "a", date: "2024-05-26", time: "08:00", sizeHa: 0.7 },
  ],
};

const helpers = [
  "emptyState", "compareMove", "movesForHerd", "currentPaddockId", "currentArrival",
  "daysBetween", "todayIso", "nowTime", "fmtDate", "arrivalsTo", "departuresFrom",
  "grazeDaysForPaddock", "avgRestDays", "movesPerMonth", "internalMovesIn"
].map(extractFn).join("\n");

const tests = `
var state = ${JSON.stringify(testState)};
(function(){
${helpers}

var ms = movesForHerd("h1");
console.assert(ms.map(m=>m.id).join(",") === "m1,m2,m3,m4,m5", "moves should be chronologically sorted");
console.assert(currentPaddockId("h1") === "a", "current paddock should be a");
console.assert(daysBetween("2024-05-01","2024-05-04") === 3, "daysBetween should be 3");
console.assert(grazeDaysForPaddock("b") === 16, "grazeDays B should be 16");
console.assert(avgRestDays("a") === 16, "avgRest A should be 16 days (left 05-04, re-entered 05-20)");
console.assert(arrivalsTo("a").length === 2, "arrivals to A should be 2 (internal moves excluded)");
console.assert(internalMovesIn("a").length === 2, "internal moves in A should be 2");
console.assert(internalMovesIn("b").length === 0, "internal moves in B should be 0");
console.assert(movesPerMonth().length === 12, "movesPerMonth should cover 12 months");
console.log("ALL LOGIC TESTS PASSED");
})();
`;
eval(tests);
