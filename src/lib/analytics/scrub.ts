const URL_LIKE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi;
const BASE58_RUN = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

export function scrub(text: string, max = 300): string {
  return text.replace(URL_LIKE, "[url]").replace(BASE58_RUN, "[address]").slice(0, max);
}

export function scrubPath(path: string): string {
  return scrub(path.split(/[?#]/)[0] ?? "", 200);
}
