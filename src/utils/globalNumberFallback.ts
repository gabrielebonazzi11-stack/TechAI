import { toNumber as parseNumber } from "./numberUtils";

const root = globalThis as unknown as Record<string, unknown>;

if (typeof root.toNumber !== "function") {
  root.toNumber = parseNumber;
}

export {};
