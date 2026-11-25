// One-shot: data.js rows carry the board farm steps; the page renders them verbatim.
import { readFileSync, writeFileSync } from "node:fs";
let m = readFileSync("lib/model.ts", "utf8");
const anchor = "    growth_multiplier: row.model.growth_multiplier,";
if (!m.includes(anchor)) throw new Error("radarRow anchor missing");
m = m.replace(anchor, anchor + "\n    farm_steps: row.farm_steps,");
writeFileSync("lib/model.ts", m);
let a = readFileSync("dashboard/app.js", "utf8");
const s = "var steps = farmSteps(row);";
if (!a.includes(s)) throw new Error("app.js anchor missing");
a = a.replace(s, "var steps = row.farm_steps || farmSteps(row);");
writeFileSync("dashboard/app.js", a);
console.log("data.js rows now carry the board farm steps; the detail view renders them");
