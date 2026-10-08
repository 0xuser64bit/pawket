// Writes script/captions.srt and script/captions.vtt from the same timings the edit burns in
// (src/cues.ts on the ElevenLabs character alignment, placed by src/placements.json).
import { readFileSync, writeFileSync } from "node:fs";
import { captionCues, wordsOf } from "../src/cues.ts";

const root = new URL("..", import.meta.url).pathname;
const placements = JSON.parse(readFileSync(`${root}src/placements.json`, "utf8"));
const lines = placements.map(([id, at]) => wordsOf(JSON.parse(readFileSync(`${root}public/audio/narration/${id}.json`, "utf8")), at));
const cues = captionCues(lines);
const stamp = (s, sep) => {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${sec}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
writeFileSync(`${root}script/captions.srt`, cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n"));
writeFileSync(`${root}script/captions.vtt`, `WEBVTT\n\n${cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n")}`);
console.log(`${cues.length} cues`);
for (const c of cues) console.log(`${c.start.toFixed(2).padStart(7)}  ${c.text}`);
