// lib/farm.ts — the farm plan generator: one protocol record in, one concrete plan out.
//
// Every step names an action, what it costs and how long it takes. Every parameter comes from the
// protocol's own record (category, chains, TVL, age) or from the constants below: no protocol name
// is ever special-cased, and the same function writes every row of the board.

import type { SnapshotProtocol } from "./model.ts";

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** Gas per transaction by how many chains the protocol spans: more chains, costlier moves. */
const GAS_TIERS: Array<[number, number]> = [[1, 2], [4, 5], [12, 9]];

/** One transaction on the protocol costs this much gas, from how many chains it spans. */
export function gasFor(p: SnapshotProtocol): number {
  const n = p.chains.length;
  for (const [top, gas] of GAS_TIERS) {
    if (n <= top) return gas;
  }
  return 15;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
export function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 90) return 75;
  if (age < 365) return 50;
  return 30;
}

/** The first chain a protocol names, or a neutral phrase when it names none. */
export function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : "its main chain";
}

/** The other chains a plan moves part of the position to, at most two of them. */
export function otherChains(p: SnapshotProtocol): string[] {
  return p.chains.slice(1, 3);
}

/** The category-specific main action, in words a farmer can follow. */
export function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? "").toLowerCase();
  const name = p.name;
  if (c.includes("lend") || c.includes("cdp") || c.includes("collateral")) {
    return "Supply $" + capital + " of USDC to " + name + " on " + chain + " and keep the position open.";
  }
  if (c.includes("dex") || c.includes("yield") || c.includes("liquidity")) {
    return "Provide $" + capital + " of liquidity into the deepest pool of " + name + " on " + chain + " and leave it in place.";
  }
  if (c.includes("bridge")) {
    return "Bridge $" + capital + " of USDC to " + chain + " through " + name + " and use the bridged funds inside its app.";
  }
  if (c.includes("staking") || c.includes("restak")) {
    return "Stake $" + capital + " of the staking asset of " + chain + " through " + name + " and keep the receipt token.";
  }
  if (c.includes("perpetual") || c.includes("derivative")) {
    return "Deposit $" + capital + " of USDC as margin on " + name + " and open one small, hedged position.";
  }
  if (c.includes("vault") || c.includes("curator") || c.includes("allocator")) {
    return "Deposit $" + capital + " into a vault of " + name + " on " + chain + " and keep the share tokens.";
  }
  if (c.includes("stable")) {
    return "Mint or deposit $" + capital + " of the stable asset through " + name + " on " + chain + ".";
  }
  if (c.includes("rwa") || c.includes("real world")) {
    return "Mint $" + capital + " of the yield asset of " + name + " on " + chain + " and hold it.";
  }
  if (c.includes("insurance")) {
    return "Buy $" + capital + " of cover from " + name + " on " + chain + " and keep the policy open.";
  }
  return "Deposit $" + capital + " of USDC into " + name + " on " + chain + " and keep the position open.";
}

/**
 * The full plan: 6 to 8 steps, each an action with a cost and a time. Multi-chain protocols get one
 * bridging step per extra chain, so the plan covers every chain the record names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(p);
  const hold = holdDaysFor(age);
  const steps: FarmStep[] = [
    {
      text: "Open a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.",
      cost: "under $" + gas + " of gas for the first transaction",
      time: "10 minutes",
    },
    {
      text: actionFor(p, capital, chain),
      cost: "$" + capital + " of capital and about $" + gas + " of gas",
      time: "20 minutes to set up",
    },
  ];
  for (const other of otherChains(p)) {
    steps.push({
      text: "Move $" + Math.round(capital / 2) + " of the position from " + chain + " to " + other + " through the bridge route that " + p.name + " lists, and repeat its main action there.",
      cost: "$" + Math.round(capital / 2) + " moved and $" + (gas + 2) + " of bridge gas",
      time: "30 minutes plus bridge wait",
    });
  }
  steps.push(
    {
      text: "Make one qualifying action each week on " + chain + ", such as a deposit, a withdraw-and-return, a swap or a vote.",
      cost: "about $" + (gas + 1) + " of gas a week",
      time: "10 minutes a week",
    },
    {
      text: "Hold the position for at least " + hold + " days, so the activity falls into more than one snapshot a launch could reward.",
      cost: "the $" + capital + " stays in the position",
      time: hold + " days",
    },
    {
      text: "Before you withdraw, read the points or rewards page that " + p.name + " itself publishes, and never claim from any other link.",
      cost: "no fee to check, and never pay anyone to claim",
      time: "10 minutes",
    },
    {
      text: "Write the wallet, the dates and every transaction hash in a farm log, so you can repeat the position or unwind it on demand.",
      cost: "nothing but the log",
      time: "5 minutes",
    },
  );
  return steps;
}

/** A step as one string: action, cost and time, inside the gate range of 20 to 600 characters. */
export function stepText(step: FarmStep): string {
  let s = step.text + " Cost: " + step.cost + " Time: " + step.time + ".";
  if (s.length > 600) {
    s = s.slice(0, 596) + "...";
  }
  if (s.length < 20) {
    s = s + " Check the protocol page for the exact figures.";
  }
  return s;
}

