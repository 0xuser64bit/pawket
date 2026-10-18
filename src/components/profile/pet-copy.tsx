"use client";

import { useState } from "react";
import { Button, Card, Row, Stack, Problem } from "@/components/pk";
import type { CompanionState } from "@/lib/companion/use-companion";
import { MAX_COPY_LENGTH, petsCopy, readPetsCopy } from "@/lib/guest/copy";
import { bringBackPets } from "@/lib/guest/storage";
import { useAndroidApp, useHere } from "@/lib/native/android";
import { askBrowserToKeep } from "@/lib/utils/persist";
import { record } from "@/lib/analytics/events";

const pets = (n: number) => `${n} ${n === 1 ? "pet" : "pets"}`;
const names = (list: readonly { name: string }[]) =>
  list.length <= 2 ? list.map((p) => p.name).join(" and ") : `${list.slice(0, -1).map((p) => p.name).join(", ")} and ${list.at(-1)!.name}`;

/**
 * A copy of the pets in this browser, and the way to bring pets back from
 * one: the record they live in, as text to keep where the player likes. In a
 * browser it is also a file; the Android app saves no files, so there it is
 * text for a note. Pets on Solana need no copy — their record is there.
 */
export function PetCopy({ companion }: { companion: CompanionState }) {
  const app = useAndroidApp();
  const { here, Here } = useHere();
  const local = companion.guests;
  const [saved, setSaved] = useState<string>();
  const [manual, setManual] = useState<string>();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string>();
  const [brought, setBrought] = useState<string>();

  async function copyText() {
    const copy = petsCopy(local);
    try {
      await navigator.clipboard.writeText(copy);
      setManual(undefined);
      setSaved(`A copy of ${pets(local.length)} is on your clipboard. Keep it somewhere safe, like a note.`);
      record({ name: "pets_copied", how: "text" });
    } catch {
      setManual(copy);
      setSaved("The clipboard did not take it, so the copy is in the box below: select it all and keep it somewhere safe.");
    }
  }

  function saveFile() {
    const name = `pawket-pets-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(new Blob([petsCopy(local)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    // The download reads the file after the click returns; letting it go at once can cancel it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setSaved(`A copy of ${pets(local.length)} is in your downloads, as ${name}.`);
    record({ name: "pets_copied", how: "file" });
  }

  async function chooseFile(file: File | undefined) {
    setProblem(undefined);
    setBrought(undefined);
    if (!file) return;
    if (file.size > MAX_COPY_LENGTH) {
      setProblem("That file is far larger than a copy of pets. Nothing was brought back.");
      return;
    }
    setText(await file.text());
  }

  function bringBack() {
    setProblem(undefined);
    setBrought(undefined);
    const read = readPetsCopy(text);
    if ("error" in read) {
      setProblem(read.error);
      return;
    }
    const result = bringBackPets(read.pets);
    if (!result) {
      setProblem(`${Here} could not store them. Nothing was brought back.`);
      return;
    }
    const parts = [
      result.added.length ? `${names(result.added)} ${result.added.length === 1 ? "is" : "are"} back in ${here}.` : "",
      result.updated.length ? `${names(result.updated)} came back with later care.` : "",
      result.same ? `${pets(result.same)} ${result.same === 1 ? "was" : "were"} here already, as new as the copy.` : "",
      read.unreadable ? `${pets(read.unreadable)} in the copy could not be read.` : "",
    ].filter(Boolean);
    setBrought(parts.join(" "));
    if (result.added.length || result.updated.length) {
      setText("");
      record({ name: "pets_brought_back" });
      void askBrowserToKeep();
    }
  }

  return (
    <Card>
      <h2 className="title">Keep a copy</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Pets in {here} live only here. A copy brings them back if {here} forgets them, after clearing its data or
        tidying up a site left alone, and moves them to another browser. Pets on Solana need none.
      </p>
      <Stack gap={3} style={{ marginTop: "var(--space-4)" }}>
        {local.length > 0 ? (
          <Row gap={2} wrap>
            {app ? null : <Button label="Save a copy" icon="doc" tone="quiet" size="sm" onClick={saveFile} />}
            <Button label="Copy as text" icon="copy" tone="quiet" size="sm" onClick={() => void copyText()} />
          </Row>
        ) : null}
        {saved ? (
          <p role="status" className="caption pk-faint">
            {saved}
          </p>
        ) : null}
        {manual ? (
          <textarea className="pk-paste" readOnly rows={4} value={manual} aria-label="Your copy" onFocus={(event) => event.currentTarget.select()} />
        ) : null}
        <details className="pk-fold" open={local.length === 0}>
          <summary>
            <span className="title">Bring pets back</span>
            <span className="caption pk-faint">From a copy you kept</span>
          </summary>
          <Stack gap={3}>
            <label htmlFor="pk-copy-paste" className="label pk-faint">
              Paste a copy
            </label>
            <textarea
              id="pk-copy-paste"
              className="pk-paste"
              rows={4}
              spellCheck={false}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(undefined);
              }}
            />
            {app ? null : (
              <label className="caption pk-faint pk-paste__file">
                Or choose the file:{" "}
                <input type="file" accept=".json,application/json" onChange={(event) => void chooseFile(event.target.files?.[0])} />
              </label>
            )}
            <div>
              <Button label="Bring them back" icon="paw" size="sm" disabled={!text.trim()} onClick={bringBack} />
            </div>
            {problem ? (
              <Problem>
                {problem}
              </Problem>
            ) : null}
            {brought ? (
              <p role="status" className="body-sm">
                {brought}
              </p>
            ) : null}
          </Stack>
        </details>
      </Stack>
    </Card>
  );
}
