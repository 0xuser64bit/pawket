// Words and caption cues from ElevenLabs character timings. Shared by the edit (burned-in captions)
// and tools/captions.mjs (the .srt and .vtt files), so the two always agree.
export type Word = { text: string; start: number; end: number };
export type Cue = { start: number; end: number; text: string };
export type Alignment = {
  text: string;
  alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
};

export function wordsOf(a: Alignment, at: number): Word[] {
  const out: Word[] = [];
  let current: Word | null = null;
  a.alignment.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (current) out.push(current);
      current = null;
      return;
    }
    if (!current) current = { text: "", start: at + a.alignment.character_start_times_seconds[i], end: 0 };
    current.text += ch;
    current.end = at + a.alignment.character_end_times_seconds[i];
  });
  if (current) out.push(current);
  return out;
}

// A good place to break a long line: before a word that starts a new phrase.
const STARTS = new Set(["and", "but", "then", "with", "that", "which", "becomes", "when", "while", "only", "after", "from", "straight"]);

/** Splits words into lines of at most `max` characters, as evenly as possible, preferring phrase breaks. */
function balance(words: Word[], max: number): Word[][] {
  const len = (ws: Word[]) => ws.map((w) => w.text).join(" ").length;
  if (len(words) <= max) return [words];
  const parts = Math.ceil(len(words) / max);
  const target = len(words) / parts;
  let best = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const head = len(words.slice(0, i));
    if (head > max) break;
    const bonus = STARTS.has(words[i].text.toLowerCase().replace(/[^a-z']/g, "")) ? 10 : 0;
    const score = Math.abs(head - target) - bonus;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [words.slice(0, best), ...balance(words.slice(best), max)];
}

/** One line at a time, at most `max` characters: sentences, then commas, then even phrase-aware splits. */
export function captionCues(lines: Word[][], max = 44): Cue[] {
  const cues: Cue[] = [];
  for (const words of lines) {
    // sentences, then clauses at commas when a sentence is long
    let clause: Word[] = [];
    const clauses: Word[][] = [];
    words.forEach((w, i) => {
      clause.push(w);
      const end = /[.?!]$/.test(w.text) || i === words.length - 1;
      const comma = /,$/.test(w.text) && clause.map((x) => x.text).join(" ").length > 12;
      if (end || comma) {
        clauses.push(clause);
        clause = [];
      }
    });
    // merge short neighbours of the same sentence, then balance anything still too long
    const merged: Word[][] = [];
    for (const c of clauses) {
      const prev = merged[merged.length - 1];
      const joined = prev ? [...prev, ...c] : c;
      if (prev && !/[.?!]$/.test(prev[prev.length - 1].text) && joined.map((x) => x.text).join(" ").length <= max) merged[merged.length - 1] = joined;
      else merged.push(c);
    }
    for (const c of merged) for (const part of balance(c, max)) cues.push({ start: part[0].start, end: part[part.length - 1].end, text: part.map((w) => w.text).join(" ") });
  }
  // Hold each cue until the next begins (up to 0.6s), so captions do not flicker between words.
  return cues.map((c, i) => ({ ...c, end: Math.min(c.end + 0.6, cues[i + 1]?.start ?? c.end + 0.6) }));
}
