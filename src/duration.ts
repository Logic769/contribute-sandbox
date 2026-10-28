const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses durations such as "250ms", "45s", "2h" into milliseconds. */
export function parseDuration(input: string): number {
  const match = /^(\d+)(ms|s|m|h|d)/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  return Number(match[1]) * UNITS[match[2]];
}
