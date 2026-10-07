"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useRequest } from "@solana/react";
import { fetchEncodedAccounts, type Address } from "@solana/kit";
import { Button, Chip, Field, Row, Stack } from "@/components/pk";
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
  const open = polls.filter((poll) => now < poll.closesAt);
  const closed = polls.filter((poll) => now >= poll.closesAt).slice(-2).reverse();

  return (
    <section className="pk-whats-on" aria-labelledby="pk-whats-on">
      <div className="pk-spread">
        <h2 id="pk-whats-on" className="display-s">
          What&apos;s on
        </h2>
        <span className="caption pk-faint">
          Kept on Solana · {sponsor.data?.available ? "Pawket pays the fee" : "a little devnet SOL each"}
        </span>
      </div>

      {upcoming.length === 0 && open.length === 0 ? (
        <div className="pk-whats-on__empty">
          <p className="body-sm pk-muted">
            Nothing planned yet.{" "}
            {founder ? "Plan the first event, or ask the guild something, below." : `When ${guild.name}'s founder plans an event or asks a question, it is here.`}
          </p>
        </div>
      ) : null}

      {upcoming.map((event) => {
        const live = now >= event.startsAt - GATHERING_LIMITS.checkInEarlySeconds && now <= event.endsAt;
        const day = new Date(event.startsAt * 1000);
        return (
          <article key={event.address} className={live ? "pk-event pk-event--live" : "pk-event"}>
            <div className="pk-event__date" aria-hidden="true">
              <span className="pk-event__month">{MONTHS[day.getUTCMonth()]}</span>
              <span className="pk-event__day">{day.getUTCDate()}</span>
              <span className="pk-event__weekday">{WEEKDAYS[day.getUTCDay()]}</span>
            </div>
            <div className="pk-event__body">
              <div className="pk-spread">
                <h3 className="title">{event.title}</h3>
                {live ? <Chip label="On now" tone="pool" icon="clock" /> : null}
              </div>
              {event.note ? <p className="body-sm pk-muted">{event.note}</p> : null}
              <p className="caption pk-faint">
                {when(event.startsAt)} until {when(event.endsAt)} · {event.going} going · {event.came} came
              </p>
              {mine.length ? (
                <Row gap={2} wrap>
                  {mine.map((entry) => {
                    const said = rsvps.find((rsvp) => rsvp.event === event.address && rsvp.pet === entry.pet.address);
                    if (said?.came) return <Chip key={entry.pet.address} label={`${entry.pet.name} came`} tone="pool" icon="check" />;
                    if (said) {
                      return live ? (
                        <Button
                          key={entry.pet.address}
                          label={`Check in ${entry.pet.name}`}
                          tone="bloom"
                          size="sm"
                          disabled={sender.busy}
                          onClick={() => void checkIn(event, entry.pet.address)}
                        />
                      ) : (
                        <Chip key={entry.pet.address} label={`${entry.pet.name} is going`} tone="bloom" icon="check" />
                      );
                    }
                    return (
                      <Button
                        key={entry.pet.address}
                        label={`Going with ${entry.pet.name}`}
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
          </article>
        );
      })}

      {[...open, ...closed].map((poll) => {
        const shut = now >= poll.closesAt;
        const mineVote = voted.get(poll.address);
        const total = poll.votes.reduce((sum, count) => sum + count, 0);
        const most = Math.max(1, ...poll.votes);
        const canVote = mine.length > 0 && mineVote === undefined && !shut;
        return (
          <article key={poll.address} className="pk-poll">
            <div className="pk-spread">
              <h3 className="title">{poll.question}</h3>
              <Chip label={shut ? "Closed" : `Until ${when(poll.closesAt)}`} icon="vote" />
            </div>
            <ul className="pk-poll__options">
              {poll.options.map((option, i) => {
                const fill = (
                  <>
                    <span className="pk-poll__bar" style={{ width: `${(poll.votes[i] / most) * 100}%` }} aria-hidden="true" />
                    <span className="pk-poll__label">
                      {option}
                      {mineVote === i ? <span className="caption pk-faint"> · your vote</span> : null}
                    </span>
                    <span className="amount-sm">{poll.votes[i]}</span>
                  </>
                );
                return (
                  <li key={option + i}>
                    {canVote ? (
                      <button
                        type="button"
                        className="pk-poll__option pk-poll__option--vote"
                        disabled={sender.busy || !companion.canSign}
                        aria-label={`Vote ${option}, ${poll.votes[i]} so far`}
                        onClick={() => void vote(poll, i)}
                      >
                        {fill}
                      </button>
                    ) : (
                      <div className={mineVote === i ? "pk-poll__option pk-poll__option--mine" : "pk-poll__option"}>{fill}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="caption pk-faint">
              {total} {total === 1 ? "vote" : "votes"}, one per wallet with a pet in {guild.name}
              {canVote ? ". Tap an answer to vote." : "."}
            </p>
          </article>
        );
      })}

      {past.length ? (
        <p className="caption pk-faint">Before: {past.map((event) => `${event.title} (${event.came} came)`).join(" · ")}</p>
      ) : null}

      {founder ? <FounderDesk guild={guild} sender={sender} onDone={done} /> : null}
    </section>
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
      <details className="pk-fold">
        <summary>
          <span className="title">Plan an event</span>
          <span className="caption pk-faint">Only you, the founder, see this</span>
        </summary>
        <Stack gap={3}>
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
      <details className="pk-fold">
        <summary>
          <span className="title">Ask {guild.name} something</span>
          <span className="caption pk-faint">A poll, one answer per wallet</span>
        </summary>
        <Stack gap={3}>
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
