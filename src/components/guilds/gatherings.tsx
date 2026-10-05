"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useRequest } from "@solana/react";
import { fetchEncodedAccounts, type Address } from "@solana/kit";
import { Button, Card, Chip, Field, Row, Stack } from "@/components/pk";
import { useCompanion } from "@/lib/companion/use-companion";
import { fetchPetRsvps, type ChainEvent, type ChainPoll, type ChainRsvp } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import {
  getCheckInInstruction,
  getCreateEventInstruction,
  getCreatePollInstruction,
  getRsvpInstruction,
  getVoteInstruction,
} from "@/lib/solana/instructions";
import { deriveBallotPda, deriveEventPda, deriveMemberPda, derivePollPda, deriveRsvpPda } from "@/lib/solana/pda";
import { GATHERING_LIMITS, PAWKET_ACCOUNTS } from "@/lib/solana/program";
import { useSponsor, usePawketSend } from "@/lib/solana/use-send";

/**
 * A guild's gatherings: events its founder plans and its pets go to, and
 * polls its founder asks and each wallet with a pet in it answers once.
 * Every one is a record on Solana — planned, RSVPed, checked in, voted —
 * with Pawket paying the fee and the rent while it can. None of it reaches
 * a vital, XP or a score; a vote has no weight but one.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sun 12 Oct, 18:00 UTC": UTC, like the streak's day, so server and client agree. */
function when(seconds: number): string {
  const d = new Date(seconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm} UTC`;
}

export function GuildGatherings({
  guild,
  events,
  polls,
}: {
  guild: { address: string; name: string; founder: string };
  events: ChainEvent[];
  polls: ChainPoll[];
}) {
  const companion = useCompanion();
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const router = useRouter();
  // The page's moment: events open and close against it until the page is read again.
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const owner = companion.owner;
  const mine = useMemo(() => companion.owned.filter((entry) => entry.member?.guild === guild.address), [companion.owned, guild.address]);
  const founder = owner !== null && owner === guild.founder;

  // What this wallet's pets have RSVPed to, and which polls it has answered: read from Solana.
  const readMine = useCallback(async () => {
    const rsvps = (await Promise.all(mine.map((entry) => fetchPetRsvps(rpc, entry.pet.address)))).flat();
    const ballots = await Promise.all(polls.map(async (poll) => (await deriveBallotPda(poll.address, owner!)).address));
    const accounts = ballots.length ? await fetchEncodedAccounts(rpc, ballots) : [];
    const voted = new Map<string, number>();
    accounts.forEach((account, i) => {
      if (account.exists && account.data.length >= PAWKET_ACCOUNTS.ballot.size) voted.set(polls[i].address, account.data[8 + 32 * 4]);
    });
    return { rsvps, voted };
  }, [owner, mine, polls]);
  const records = useRequest(owner ? readMine : null);
  const rsvps: ChainRsvp[] = records.data?.rsvps ?? [];
  const voted = records.data?.voted ?? new Map<string, number>();

  const done = () => {
    records.refresh();
    router.refresh();
  };

  async function going(event: ChainEvent, pet: Address) {
    const member = (await deriveMemberPda(pet)).address;
    const rsvp = (await deriveRsvpPda(event.address, pet)).address;
    const result = await sender.act(`Going to ${event.title}`, ({ owner: signer, payer }) => [
      getRsvpInstruction({ owner: signer, payer, pet, member, event: event.address, rsvp }),
    ]);
    if (result?.outcome === "confirmed") done();
  }

  async function checkIn(event: ChainEvent, pet: Address) {
    const rsvp = (await deriveRsvpPda(event.address, pet)).address;
    const result = await sender.act(`Check in at ${event.title}`, ({ owner: signer }) => [
      getCheckInInstruction({ owner: signer, pet, event: event.address, rsvp }),
    ]);
    if (result?.outcome === "confirmed") done();
  }

  async function vote(poll: ChainPoll, option: number) {
    const pet = mine[0]?.pet.address;
    if (!pet || !owner) return;
    const member = (await deriveMemberPda(pet)).address;
    const ballot = (await deriveBallotPda(poll.address, owner)).address;
    const result = await sender.act(`Vote “${poll.options[option]}”`, ({ owner: signer, payer }) => [
      getVoteInstruction({ owner: signer, payer, pet, member, poll: poll.address, ballot, option }),
    ]);
    if (result?.outcome === "confirmed") done();
  }

  const upcoming = events.filter((event) => event.endsAt > now);
  const past = events.filter((event) => event.endsAt <= now).slice(-3).reverse();

  return (
    <Card>
      <h2 className="title">Gatherings</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Events {guild.name}&apos;s founder plans and its pets go to, and questions each wallet answers once. Kept on
        Solana; {sponsor.data?.available ? "Pawket pays the fee and the rent" : "each costs a little devnet SOL"}. None of
        it changes a pet.
      </p>

      <Stack gap={4} className="pk-foot">
        {upcoming.length === 0 && polls.length === 0 ? (
          <p className="body-sm pk-faint">Nothing planned yet{founder ? " — plan the first one below" : ""}.</p>
        ) : null}

        {upcoming.map((event) => {
          const open = now >= event.startsAt - GATHERING_LIMITS.checkInEarlySeconds && now <= event.endsAt;
          return (
            <div key={event.address} className="pk-gathering">
              <div className="pk-spread">
                <span className="title">{event.title}</span>
                <Chip label={open ? "On now" : when(event.startsAt)} tone={open ? "pool" : undefined} icon="clock" />
              </div>
              {event.note ? <p className="body-sm pk-muted">{event.note}</p> : null}
              <span className="caption pk-faint">
                {event.going} going · {event.came} came · until {when(event.endsAt)}
              </span>
              {mine.length ? (
                <Row gap={2} wrap>
                  {mine.map((entry) => {
                    const said = rsvps.find((rsvp) => rsvp.event === event.address && rsvp.pet === entry.pet.address);
                    if (said?.came) return <Chip key={entry.pet.address} label={`${entry.pet.name} came`} tone="pool" icon="check" />;
                    if (said) {
                      return open ? (
                        <Button
                          key={entry.pet.address}
                          label={`Check ${entry.pet.name} in`}
                          tone="bloom"
                          size="sm"
                          disabled={sender.busy}
                          onClick={() => void checkIn(event, entry.pet.address)}
                        />
                      ) : (
                        <Chip key={entry.pet.address} label={`${entry.pet.name} is going`} tone="bloom" />
                      );
                    }
                    return (
                      <Button
                        key={entry.pet.address}
                        label={`${entry.pet.name} is going`}
                        tone="quiet"
                        size="sm"
                        disabled={sender.busy || !companion.canSign}
                        onClick={() => void going(event, entry.pet.address)}
                      />
                    );
                  })}
                </Row>
              ) : null}
            </div>
          );
        })}

        {polls.map((poll) => {
          const closed = now >= poll.closesAt;
          const mineVote = voted.get(poll.address);
          const total = poll.votes.reduce((sum, count) => sum + count, 0);
          return (
            <div key={poll.address} className="pk-gathering">
              <div className="pk-spread">
                <span className="title">{poll.question}</span>
                <Chip label={closed ? "Closed" : `Until ${when(poll.closesAt)}`} icon="vote" />
              </div>
              <div className="pk-receipt">
                {poll.options.map((option, i) => (
                  <div key={option + i} className="pk-receipt__row">
                    <span className="pk-receipt__k">
                      {option}
                      {mineVote === i ? " · your vote" : ""}
                    </span>
                    {mine.length && mineVote === undefined && !closed ? (
                      <Button label={`Vote · ${poll.votes[i]}`} tone="quiet" size="sm" disabled={sender.busy || !companion.canSign} onClick={() => void vote(poll, i)} />
                    ) : (
                      <span className="pk-receipt__v">{poll.votes[i]}</span>
                    )}
                  </div>
                ))}
              </div>
              <span className="caption pk-faint">
                {total} {total === 1 ? "vote" : "votes"}, one per wallet with a pet in {guild.name}.
              </span>
            </div>
          );
        })}

        {past.length ? (
          <p className="caption pk-faint">
            Before: {past.map((event) => `${event.title} (${event.came} came)`).join(" · ")}
          </p>
        ) : null}

        {founder ? <FounderDesk guild={guild} sender={sender} onDone={done} /> : null}
      </Stack>
    </Card>
  );
}

/** What only the founder sees: planning an event, and asking the guild something. */
function FounderDesk({
  guild,
  sender,
  onDone,
}: {
  guild: { address: string; name: string };
  sender: ReturnType<typeof usePawketSend>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [start, setStart] = useState("");
  const [hours, setHours] = useState("1");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [days, setDays] = useState("3");
  const [problem, setProblem] = useState<string>();

  async function plan() {
    const startsAt = Math.floor(new Date(start).getTime() / 1000);
    if (!Number.isFinite(startsAt)) return setProblem("Choose when it starts.");
    const endsAt = startsAt + Math.round(Number(hours) * 3600);
    setProblem(undefined);
    const event = (await deriveEventPda(guild.address, startsAt)).address;
    try {
      const result = await sender.act(`Plan ${title.trim()}`, ({ owner, payer }) => [
        getCreateEventInstruction({ owner, payer, guild: guild.address, event, id: startsAt, title, note, startsAt, endsAt }),
      ]);
      if (result?.outcome === "confirmed") {
        setTitle("");
        setNote("");
        onDone();
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That event could not be built. Nothing was sent.");
    }
  }

  async function ask() {
    const id = Math.floor(Date.now() / 1000);
    const chosen = options.map((option) => option.trim()).filter(Boolean);
    const poll = (await derivePollPda(guild.address, id)).address;
    setProblem(undefined);
    try {
      const result = await sender.act(`Ask “${question.trim()}”`, ({ owner, payer }) => [
        getCreatePollInstruction({ owner, payer, guild: guild.address, poll, id, question, options: chosen, closesAt: id + Number(days) * 86_400 }),
      ]);
      if (result?.outcome === "confirmed") {
        setQuestion("");
        setOptions(["", "", "", ""]);
        onDone();
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That poll could not be built. Nothing was sent.");
    }
  }

  return (
    <Stack gap={3}>
      <details className="pk-founder-desk">
        <summary className="label">Plan an event</summary>
        <Stack gap={3} style={{ marginTop: "var(--space-3)" }}>
          <Field label="What it is" icon="star" placeholder="Sunday nap in the sun" maxLength={GATHERING_LIMITS.maxTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Field label="A line about it" icon="chat" placeholder="By the big window. Bring a blanket." maxLength={GATHERING_LIMITS.maxNote} value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="pk-field">
            <span className="label pk-faint">Starts</span>
            <input className="pk-field__input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="pk-field">
            <span className="label pk-faint">Hours</span>
            <select className="pk-field__input" value={hours} onChange={(e) => setHours(e.target.value)}>
              {["1", "2", "3", "6", "24"].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <div>
            <Button label="Plan it" tone="bloom" size="sm" icon="guild" disabled={sender.busy || title.trim().length < 3 || !start} onClick={() => void plan()} />
          </div>
        </Stack>
      </details>
      <details className="pk-founder-desk">
        <summary className="label">Ask {guild.name}</summary>
        <Stack gap={3} style={{ marginTop: "var(--space-3)" }}>
          <Field label="The question" icon="vote" placeholder="Where should we nap next?" maxLength={GATHERING_LIMITS.maxQuestion} value={question} onChange={(e) => setQuestion(e.target.value)} />
          {options.map((option, i) => (
            <Field
              key={i}
              label={`Option ${i + 1}`}
              icon="check"
              placeholder={i < 2 ? `Option ${i + 1}` : "Optional"}
              maxLength={GATHERING_LIMITS.maxOption}
              value={option}
              onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
            />
          ))}
          <label className="pk-field">
            <span className="label pk-faint">Open for</span>
            <select className="pk-field__input" value={days} onChange={(e) => setDays(e.target.value)}>
              {[
                ["1", "a day"],
                ["3", "three days"],
                ["7", "a week"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <Button
              label="Ask it"
              tone="bloom"
              size="sm"
              icon="vote"
              disabled={sender.busy || question.trim().length < 3 || options.filter((o) => o.trim()).length < 2}
              onClick={() => void ask()}
            />
          </div>
        </Stack>
      </details>
      {problem ? (
        <p role="alert" className="body-sm" style={{ color: "var(--alarm-text)" }}>
          {problem}
        </p>
      ) : null}
    </Stack>
  );
}
