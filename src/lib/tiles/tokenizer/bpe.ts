import { buildCorpus } from "./corpus";

// GPT-2 style pre-tokenizer pattern: splits into word-like chunks, numeric
// runs, punctuation runs, and whitespace, each optionally preceded by a
// leading space. BPE merges happen *within* each chunk, never across one.
const PRETOKEN_RE = /'s|'t|'re|'ve|'m|'ll|'d| ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+/g;

export interface BpeModel {
  mergeRank: Map<string, number>;
  vocabSize: number;
}

const PAIR_SEP = "\u0000";

function trainBpe(corpus: string, numMerges: number): BpeModel {
  const chunks = corpus.match(PRETOKEN_RE) ?? [];
  let wordSymbols: string[][] = chunks.map((c) => [...c]);
  const merges: [string, string][] = [];

  for (let m = 0; m < numMerges; m++) {
    const pairCounts = new Map<string, number>();
    for (const symbols of wordSymbols) {
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = symbols[i] + PAIR_SEP + symbols[i + 1];
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
    let bestKey = "";
    let bestCount = 1; // require at least 2 occurrences to bother merging
    for (const [k, c] of pairCounts) {
      if (c > bestCount) {
        bestCount = c;
        bestKey = k;
      }
    }
    if (!bestKey) break;
    const [a, b] = bestKey.split(PAIR_SEP);
    merges.push([a, b]);
    const merged = a + b;
    wordSymbols = wordSymbols.map((symbols) => {
      const out: string[] = [];
      let i = 0;
      while (i < symbols.length) {
        if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
          out.push(merged);
          i += 2;
        } else {
          out.push(symbols[i]);
          i++;
        }
      }
      return out;
    });
  }

  const mergeRank = new Map<string, number>();
  merges.forEach(([a, b], i) => mergeRank.set(a + PAIR_SEP + b, i));
  // base vocab (single chars seen) + merged tokens
  const baseSymbols = new Set<string>();
  for (const symbols of chunks.map((c) => [...c])) for (const s of symbols) baseSymbols.add(s);
  return { mergeRank, vocabSize: baseSymbols.size + merges.length };
}

function encodeChunk(chunk: string, mergeRank: Map<string, number>): string[] {
  let symbols = [...chunk];
  while (symbols.length > 1) {
    let bestRank = Infinity;
    let bestIdx = -1;
    for (let i = 0; i < symbols.length - 1; i++) {
      const rank = mergeRank.get(symbols[i] + PAIR_SEP + symbols[i + 1]);
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    symbols = [...symbols.slice(0, bestIdx), symbols[bestIdx] + symbols[bestIdx + 1], ...symbols.slice(bestIdx + 2)];
  }
  return symbols;
}

export function encode(text: string, model: BpeModel): string[] {
  const chunks = text.match(PRETOKEN_RE) ?? [];
  return chunks.flatMap((c) => encodeChunk(c, model.mergeRank));
}

let cached: BpeModel | null = null;

/** Trains once (lazily) on a bundled synthetic corpus, then caches for the session. */
export function getModel(): BpeModel {
  if (!cached) cached = trainBpe(buildCorpus(), 900);
  return cached;
}
