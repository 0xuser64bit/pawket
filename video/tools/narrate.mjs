// Narration from script/narration.json through ElevenLabs, one file per section with character
// timings (for captions and placement). The key comes from ELEVENLABS_API_KEY and is never written.
// Usage: ELEVENLABS_API_KEY=… node tools/narrate.mjs [section-id …]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY");
const root = new URL("../", import.meta.url).pathname;
const { voice, sections } = JSON.parse(readFileSync(`${root}script/narration.json`, "utf8"));
const out = `${root}public/audio/narration`;
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);

for (const [i, section] of sections.entries()) {
  if (only.length && !only.includes(section.id)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text: section.text,
      model_id: voice.model,
      voice_settings: voice.settings,
      // Neighbouring lines keep the delivery continuous across separate files.
      previous_text: sections[i - 1]?.text,
      next_text: sections[i + 1]?.text,
    }),
  });
  if (!res.ok) throw new Error(`${section.id}: ${res.status} ${await res.text()}`);
  const { audio_base64, alignment } = await res.json();
  writeFileSync(`${out}/${section.id}.mp3`, Buffer.from(audio_base64, "base64"));
  writeFileSync(`${out}/${section.id}.json`, JSON.stringify({ text: section.text, alignment }));
  const end = alignment.character_end_times_seconds.at(-1);
  console.log(`${section.id}: ${end.toFixed(2)}s`);
}
