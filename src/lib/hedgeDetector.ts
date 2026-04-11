export interface HedgeResult {
  hedges: string[];
  fillerCount: number;
  assertiveCount: number;
  scoreDelta: number;
}

const HEDGE_PATTERNS: RegExp[] = [
  /just wanted to/gi,
  /sorry to bother/gi,
  /i think maybe/gi,
  /i think perhaps/gi,
  /kind of\b/gi,
  /sort of\b/gi,
  /i guess\b/gi,
  /\bperhaps\b/gi,
  /might be\b/gi,
  /\bpossibly\b/gi,
  /\bbasically\b/gi,
  /you know\?/gi,
  /if that makes sense/gi,
  /does that make sense/gi,
  /i was just/gi,
  /\bmaybe\b/gi,
  /not sure if/gi,
  /i could be wrong/gi,
  /just a thought/gi,
  /\bapologies\b/gi,
];

const FILLER_PATTERNS: RegExp[] = [
  /\bum\b/gi,
  /\buh\b/gi,
  /\ber\b/gi,
  /\blike,\b/gi,
  /\byou know,\b/gi,
];

const ASSERTIVE_PATTERNS: RegExp[] = [
  /we built/gi,
  /we created/gi,
  /we launched/gi,
  /our (system|product|platform|app|solution)/gi,
  /the results show/gi,
  /we achieved/gi,
  /we have/gi,
  /i am confident/gi,
  /our data shows/gi,
  /we demonstrated/gi,
  /we proved/gi,
  /the numbers/gi,
  /we shipped/gi,
  /we deployed/gi,
];

export function detectHedges(text: string): HedgeResult {
  const hedges: string[] = [];

  for (const pattern of HEDGE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      hedges.push(...matches.map((m) => m.toLowerCase()));
    }
  }

  let fillerCount = 0;
  for (const pattern of FILLER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) fillerCount += matches.length;
  }

  let assertiveCount = 0;
  for (const pattern of ASSERTIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) assertiveCount += matches.length;
  }

  const scoreDelta =
    hedges.length * -4 + fillerCount * -1 + assertiveCount * 3;

  return { hedges, fillerCount, assertiveCount, scoreDelta };
}

/**
 * Returns the text with hedge phrases wrapped in <mark class="hedge-highlight"> spans.
 */
export function highlightHedges(text: string): string {
  let result = text;
  for (const pattern of HEDGE_PATTERNS) {
    result = result.replace(
      pattern,
      (match) => `<mark class="hedge-highlight">${match}</mark>`
    );
  }
  return result;
}
