// A synthetic training corpus for the local BPE demo, generated from word
// lists and sentence templates (no network, no external dataset). This
// gives a small-but-genuine BPE vocabulary - common English words and
// morphemes merge into single tokens, the same way production tokenizers
// train, just on a far smaller corpus than something like GPT-4's.

const COMMON_WORDS = [
  "the", "of", "and", "a", "to", "in", "is", "you", "that", "it", "he", "was", "for", "on", "are", "as",
  "with", "his", "they", "I", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but",
  "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which",
  "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these",
  "so", "some", "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more", "write",
  "go", "see", "number", "no", "way", "could", "people", "my", "than", "first", "water", "been", "call",
  "who", "its", "now", "find", "long", "down", "day", "did", "get", "come", "made", "may", "part", "over",
  "new", "sound", "take", "only", "little", "work", "know", "place", "year", "live", "me", "back", "give",
  "most", "very", "after", "thing", "our", "just", "name", "good", "sentence", "man", "think", "say", "great",
  "where", "help", "through", "much", "before", "line", "right", "too", "mean", "old", "any", "same", "tell",
  "boy", "follow", "came", "want", "show", "also", "around", "form", "three", "small", "set", "put", "end",
  "does", "another", "well", "large", "must", "big", "even", "such", "because", "turn", "here", "why", "ask",
]
  .concat([
    "function", "class", "return", "import", "export", "const", "let", "var", "async", "await", "public",
    "private", "static", "void", "string", "boolean", "interface", "implementation", "algorithm", "complexity",
    "matrix", "vector", "gradient", "neural", "network", "tensor", "embedding", "token", "language", "model",
    "transformer", "attention", "softmax", "activation", "dropout", "optimizer", "learning", "rate", "epoch",
    "batch", "dataset", "training", "validation", "test", "accuracy", "loss", "prediction", "classification",
    "regression", "backward", "forward", "layer", "weight", "bias", "convolution", "pooling", "recurrent",
  ])
  .concat([
    "running", "jumping", "walking", "talking", "reading", "writing", "coding", "testing", "building", "creating",
    "development", "application", "computer", "science", "mathematics", "physics", "chemistry", "biology",
    "information", "technology", "engineering", "university", "education", "knowledge", "understanding",
  ]);

const PUNCT = [".", ",", "!", "?", ";", ":"];

function zipfPick<T>(items: T[], rng: () => number): T {
  // crude Zipf-like skew toward the front of the list, which is sorted roughly by frequency.
  const idx = Math.floor(Math.pow(rng(), 2.5) * items.length);
  return items[Math.min(idx, items.length - 1)];
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCorpus(sentences = 4000): string {
  const rng = mulberry32(42);
  const lines: string[] = [];
  for (let s = 0; s < sentences; s++) {
    const len = 4 + Math.floor(rng() * 10);
    const words: string[] = [];
    for (let i = 0; i < len; i++) words.push(zipfPick(COMMON_WORDS, rng));
    let sentence = words.join(" ");
    sentence = sentence[0].toUpperCase() + sentence.slice(1);
    sentence += zipfPick(PUNCT, rng);
    lines.push(sentence);
  }
  return lines.join(" ");
}
