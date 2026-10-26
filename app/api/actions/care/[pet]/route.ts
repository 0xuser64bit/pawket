import { isAddress } from "@solana/kit";
import { CARE_ACTION_LABEL, MOOD_LABEL } from "@/lib/game/appearance";
import { CareActionType } from "@/lib/game/enums";
import { validateCareCooldown } from "@/lib/game/math";
import { projectGuestPet, streakAsOf } from "@/lib/guest/pet";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { getCareInstruction } from "@/lib/solana/instructions";
import { absolute, actionError, actionJson, adoptLinkedAction, caller, postedAccount, preflight } from "@/server/actions";
import { actionLimit, mayPayFee, sponsoredForPlayer, sponsorState } from "@/server/sponsor";
import { readPet } from "@/server/solana";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Props = { params: Promise<{ pet: string }> };

export async function GET(request: Request, { params }: Props) {
  const { pet } = await params;
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => null) : null;
  if (!onChain) return actionError("No pet lives at that address.", 404);
  const record = toCompanionRecord(onChain);
  const now = new Date();
  const projected = projectGuestPet(record, now);
  const streak = streakAsOf(record.streak, now).count;
  return actionJson({
    type: "action",
    icon: absolute(request, `/api/actions/icon?pet=${pet}`),
    title: `${record.name} · ${MOOD_LABEL[projected.mood]}`,
    description: `Level ${projected.level}, ${streak === 0 ? "no run today yet" : `a ${streak}-day run`}. Only ${record.name}'s owner can care for them, and each care rests 30 minutes. Anyone else can wave — once a day, into ${record.name}'s guestbook on Solana — or adopt their own. Network fees are covered while sponsorship is available.`,
    label: "Care",
    links: {
      actions: [
        ...Object.values(CareActionType).map((action) => ({
          type: "transaction",
          label: CARE_ACTION_LABEL[action],
          href: `/api/actions/care/${pet}?action=${action}`,
        })),
        { type: "transaction", label: `Wave at ${record.name}`, href: `/api/actions/wave/${pet}` },
        adoptLinkedAction("Adopt your own"),
      ],
    },
  });
}

export async function POST(request: Request, { params }: Props) {
  const { pet } = await params;
  const action = new URL(request.url).searchParams.get("action") as CareActionType | null;
  if (!action || !Object.values(CareActionType).includes(action)) return actionError("Choose feed, play, brush or rest.");
  const account = await postedAccount(request);
  if (!account || !isAddress(account)) return actionError("That is not a wallet address. Nothing was sent.");
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => null) : null;
  if (!onChain) return actionError("No pet lives at that address.", 404);
  const { pet: chainPet, passport } = onChain;
  if (chainPet.owner !== account) {
    return actionError(`Only ${chainPet.name}'s owner can care for them. Their record is open to everyone, though.`, 403);
  }
  const cooldown = validateCareCooldown(toCompanionRecord(onChain).lastActionAt[action], action, new Date());
  if (!cooldown.allowed) return actionError(`${cooldown.message} Nothing was sent.`, 409);

  const sponsor = await sponsorState().catch(() => null);
  if (!sponsor?.available) {
    return actionError(sponsor?.reason ?? "The sponsor cannot reach the network. Nothing was sent.", 503);
  }
  if (!actionLimit(caller(request)) || !mayPayFee()) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);

  const transaction = await sponsoredForPlayer(sponsor.signer, chainPet.owner, ({ owner }) => [
    getCareInstruction({ owner, pet: chainPet.address, passport: passport.address, action }),
  ]).catch(() => null);
  if (!transaction) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  return actionJson({
    type: "transaction",
    transaction,
    message: `${CARE_ACTION_LABEL[action]} ${chainPet.name}. Sign it; Pawket pays the fee.`,
  });
}
