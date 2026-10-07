"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner, Button, Card, Field, Icon, PetArt, Stack, Waiting } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { CREST_COLOURS, CREST_GLYPHS, guildProblems, slugFor } from "@/lib/guilds/guild";
import { fetchGuild, toCompanionRecord } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { getFoundGuildInstruction } from "@/lib/solana/instructions";
import { deriveGuildPda, deriveMemberPda } from "@/lib/solana/pda";
import { GUILD_LIMITS } from "@/lib/solana/program";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { GuildCrest } from "./guild-crest";

/**
 * Founding a guild: its name (which is its address), a motto, a crest — a
 * glyph and a colour — and the pet that founds it and becomes its first
 * member. The crest and the address are drawn as they are typed. One
 * signature, from the pet's owner; Pawket pays the fee and the rent while
 * it can. A name nobody has is checked before the wallet opens.
 */
export function FoundGuild() {
  const companion = useCompanion();
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const router = useRouter();
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [crest, setCrest] = useState(0);
  const [colour, setColour] = useState(0);
  const [founder, setFounder] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [taken, setTaken] = useState<string>();
  const [connecting, setConnecting] = useState(false);

  if (!companion.ready) return <Waiting label="Reading your pets" />;

  const free = companion.owned.filter((entry) => entry.member === null);
  const chosen = free.find((entry) => entry.pet.address === founder) ?? free[0] ?? null;
  const slug = slugFor(name);
  const problems = guildProblems({ name, motto, crest, colour });
  const shownName = name.trim() || "Your guild";

  async function found() {
    setTried(true);
    setTaken(undefined);
    if (Object.keys(problems).length > 0 || !chosen) return;
    if (await fetchGuild(rpc, slug).catch(() => null)) {
      setTaken(`A guild already lives at ${slug}. A name is one guild; try another.`);
      return;
    }
    const guild = (await deriveGuildPda(slug)).address;
    const member = (await deriveMemberPda(chosen.pet.address)).address;
    const result = await sender.act(`Found ${name.trim()}`, ({ owner, payer }) => [
      getFoundGuildInstruction({ owner, payer, pet: chosen.pet.address, guild, member, slug, name, motto, crest, colour }),
    ]);
    if (result?.outcome === "confirmed") {
      companion.refresh();
      router.push(`/guilds/${slug}`);
    }
  }

  return (
    <Stack gap={5}>
      <div className="pk-guild-head">
        <GuildCrest crest={crest} colour={colour} name={shownName} size="lg" />
        <div>
          <p className="display-m" style={{ overflowWrap: "anywhere" }}>
            {shownName}
          </p>
          <p className="body pk-muted">{motto.trim() || "A motto, if you want one."}</p>
          <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
            Its address: <span className="addr">/guilds/{slug || "…"}</span>
          </p>
        </div>
      </div>

      <Card>
        <Stack gap={5}>
          <Field
            label="Guild name"
            name="guild-name"
            icon="guild"
            maxLength={GUILD_LIMITS.maxName}
            placeholder="Window Watchers"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={tried ? problems.name : undefined}
            helper={`${GUILD_LIMITS.minName} to ${GUILD_LIMITS.maxName} characters. It is the guild's address, so it is one guild for good.`}
          />
          <Field
            label="Motto"
            name="guild-motto"
            icon="chat"
            maxLength={GUILD_LIMITS.maxMotto}
            placeholder="Every bird gets a look."
            value={motto}
            onChange={(event) => setMotto(event.target.value)}
            error={tried ? problems.motto : undefined}
            helper="Optional. One line, up to 80 characters."
          />
          <fieldset className="pk-fieldset">
            <legend className="label pk-faint">Crest</legend>
            <div className="pk-crests" role="radiogroup" aria-label="Crest">
              {CREST_GLYPHS.map((glyph, i) => (
                <label key={glyph} className="pk-crest-pick">
                  <input type="radio" name="crest" className="pk-sr" checked={crest === i} onChange={() => setCrest(i)} />
                  <Icon name={glyph} size={22} />
                  <span className="pk-sr">{glyph}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="pk-fieldset">
            <legend className="label pk-faint">Colour</legend>
            <div className="pk-choices" role="radiogroup" aria-label="Colour">
              {CREST_COLOURS.map((hue, i) => (
                <label key={hue.id} className="pk-colour-pick" title={hue.label}>
                  <input type="radio" name="colour" className="pk-sr" checked={colour === i} onChange={() => setColour(i)} />
                  <span className="pk-swatch" style={{ background: hue.token }} aria-hidden="true" />
                  <span className="pk-sr">{hue.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Stack>
      </Card>

      <Card>
        <h2 className="title">Who founds it</h2>
        {!companion.owner ? (
          <>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              A guild is founded by a pet on Solana, which becomes its first member. Connect the wallet that keeps
              one; connecting signs nothing.
            </p>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
            </div>
          </>
        ) : free.length === 0 ? (
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            {companion.chainError
              ? "Solana did not answer when this page asked for your pets. Reload to ask again."
              : companion.owned.length === 0
                ? "This wallet keeps no pet on Solana yet. Keep one there from Home, and it can found a guild."
                : "Every pet this wallet keeps is in a guild already. A pet is in one at a time."}
          </p>
        ) : (
          <div className="pk-switch" role="radiogroup" aria-label="Founding pet" style={{ marginTop: "var(--space-3)" }}>
            {free.map((entry) => {
              const on = entry.pet.address === chosen?.pet.address;
              return (
                <label key={entry.pet.address} className={["pk-founder", on && "pk-founder--on"].filter(Boolean).join(" ")}>
                  <input type="radio" name="founder" className="pk-sr" checked={on} onChange={() => setFounder(entry.pet.address)} />
                  <span className="pk-avatar" aria-hidden="true">
                    <PetArt {...petLook(toCompanionRecord(entry))} still />
                  </span>
                  <span className="title">{entry.pet.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      {taken ? <Banner tone="info" title="That name is taken" body={taken} /> : null}
      <div>
        <Button
          label={`Found ${shownName}`}
          tone="bloom"
          size="lg"
          icon="guild"
          disabled={!chosen || sender.busy || !companion.canSign}
          onClick={() => void found()}
        />
        <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
          {sponsor.data?.available
            ? "Pawket pays the fee and the rent. Your wallet signs as the pet's owner."
            : "It costs a small network fee and rent in devnet SOL."}{" "}
          A guild starts with no coin, and it never changes a pet.
        </p>
      </div>
      {connecting ? (
        <WalletSheet
          why="Connect the wallet that keeps the pet that will found the guild. It signs only the founding."
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Stack>
  );
}
