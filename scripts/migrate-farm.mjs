// One-shot migration: lib/model.ts keeps scoring; lib/farm.ts owns the plans.
import { readFileSync, writeFileSync } from "node:fs";
const path = "lib/model.ts";
let t = readFileSync(path, "utf8");
const cut = (from, to) => {
  const i = t.indexOf(from);
  const j = t.indexOf(to);
  if (i < 0 || j < 0 || j <= i) throw new Error("marker not found: " + from);
  t = t.slice(0, i) + t.slice(j);
};
cut("/** A farm step:", "/** One row of board.json");
cut("/** A step as one string", "/** The live-token protocols, by market cap");
t = "import { farmSteps, stepText } from \"./farm.ts\";\n" + t;
writeFileSync(path, t);
console.log("lib/model.ts now imports the farm plan generator from lib/farm.ts");
