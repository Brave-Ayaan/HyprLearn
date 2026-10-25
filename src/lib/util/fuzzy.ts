/**
 * Subsequence match: every char of `query` must appear in order in `text`.
 * Score rewards tighter (more consecutive) matches. Returns -1 if no match.
 *
 * An exact substring match always outranks a scattered subsequence match,
 * even one the greedy leftmost scan happens to score well (e.g. "help"
 * against "...classicalciphers...": greedy picks the 'h'+'e' inside
 * "ciphers" - adjacent, so a +2 bonus - before ever reaching the literal
 * word "Help" sitting later in a different candidate's text). Without this
 * check that accidental adjacency could outscore the real match.
 */
export function fuzzyScore(query: string, text: string): number {
  if (query.length === 0) return 0;
  const substringIndex = text.indexOf(query);
  if (substringIndex !== -1) {
    return 1000 - substringIndex;
  }

  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      score += lastMatch === ti - 1 ? 2 : 1;
      lastMatch = ti;
      qi++;
    }
  }
  return qi === query.length ? score : -1;
}
