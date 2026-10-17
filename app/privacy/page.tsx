import type { Metadata } from "next";
import { Mark, Screen, Stack } from "@/components/pk";
import { SUPPORT_EMAIL } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Pawket keeps, where, and who can see it.",
};

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "What stays on your device",
    body: [
      "Pets you keep in this browser or in the Android app, their care, your name and look, outfits, rooms and settings are stored on your device, not on Pawket's server. Clearing the site's or the app's data, or uninstalling the app, removes them. The Android app opts out of Android backup.",
      "A wallet you connect is remembered so it can reconnect; disconnecting or clearing data forgets it.",
      "Linking a Pawket Wallet makes a key on this device that cannot be read or exported, by Pawket either. Your wallet approves the link, when it ends and how many actions a day it may sign. The key can do only what Pawket's program lets a linked device do, and it can never move your balance. Unlink it in Pawket Wallet; clearing storage loses the key, and you link again.",
    ],
  },
  {
    title: "Wallets and Solana",
    body: [
      "Pawket never asks for your recovery phrase or a private key. Your wallet approves and signs.",
      "What you keep on Solana is public: a pet's account, its name, care, guild, guestbook and purchases, wallet addresses and transaction signatures. Anyone and any explorer can read them, and clearing your device does not remove them. Pawket runs on Solana devnet, a test network.",
    ],
  },
  {
    title: "What Pawket's server sees",
    body: [
      "Pawket's pages come from pawket.world, hosted on Vercel. To load them, read Solana, prepare the transactions you ask for and pay sponsored fees, the server receives your requests, which can include public wallet and pet addresses, the action asked for and its transaction.",
      "Solana RPC providers receive the reads and the transactions sent. A guild coin's quotes and transactions are built with Meteora's software and run on Meteora's programs.",
      "Hosting and network providers process connection data such as IP addresses and request logs under their own policies. Pawket has no player accounts, no database of players and no advertising, and does not sell or share personal data.",
    ],
  },
  {
    title: "What Pawket counts",
    body: [
      "Pawket uses Vercel Web Analytics to count page views and a few moments of the game: an adoption, a care, a finished round, a return to Home (by how many days old your pets are, never a date), a reminder added, a copy of your pets saved or brought back, and how far a step onto Solana got. Each count is one or two fixed words. None carries your name, a wallet or pet address, a signature, a score or anything you type, and a page is counted without its query or any Solana address in it.",
      "Vercel Web Analytics sets no cookie and tells one visit from another only within a day. Vercel processes connection data, such as your IP address, to count a visit, under its own policy.",
      "When a screen breaks while you are counted, the page tells Pawket's own server which page broke and the kind of error, with any link or address taken out, so it can be fixed.",
      "Turn counting off in Profile, Settings, or have your browser send Global Privacy Control or Do Not Track, and Pawket counts nothing, page views included, and sends no error reports.",
    ],
  },
  {
    title: "Photos, sharing and reminders",
    body: [
      "A room photo is drawn on your device; saving or sharing it sends it only where you choose. Pawket does not upload it. A shared link goes through your device's share sheet, and a reminder is a calendar event you decide whether to save. A care reminder in the Android app is worked out and scheduled on the phone, from your pets' records; nothing about it reaches Pawket.",
      "The Android app asks for the internet and, only if you turn care reminders on, to post notifications. It never asks for your calendar, contacts, location, camera or microphone.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "Play without a wallet. Choose whether to keep a pet on Solana, link a device, share a photo, save a reminder, or be counted. Keep a copy of the pets in this browser from Profile; it stays wherever you put it. Delete local data in your browser or Android settings, and unlink a device before you give it away. What is already on Solana stays there.",
    ],
  },
];

/** The privacy policy, for the web and the Android app alike. */
export default function PrivacyPage() {
  return (
    <Screen width="narrow">
      <div className="pk-screen__bar">
        <Mark href="/" size={26} type={18} />
      </div>
      <Stack gap={6} style={{ paddingTop: "var(--space-4)", paddingBottom: "var(--space-9)" }}>
        <div>
          <h1 className="display-m">Privacy</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            What Pawket keeps, where, and who can see it — on the web and in the Android app.
          </p>
        </div>
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="title">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="title">Contact</h2>
          <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
            Questions about privacy, a report about a guild, or anything else:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
          <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
            Updated 18 October 2026.
          </p>
        </section>
      </Stack>
    </Screen>
  );
}
