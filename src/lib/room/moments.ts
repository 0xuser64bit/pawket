import { CareActionType } from "@/lib/game/enums";

/**
 * Moments are what the player and the pet do together in the 3D room. Each
 * is data: which clips the player plays and when, where the pet stands,
 * what it is cued to do, which prop is in a hand, and when a hand is on the
 * pet. The room implements every cue, formation and prop once, so a new
 * emote is a clip plus an entry here — no new component.
 *
 * A clip is named as it appears in the body GLB (`public/3d/human/`), or in
 * the file at `src` when it ships separately. Any clip made for the same
 * rig works: the Quaternius Universal Base Characters skeleton (65 joints,
 * pelvis → spine_01..03 → neck_01 → Head, UE naming).
 *
 * Moments are expression only. None changes a vital, XP or the streak;
 * a care moment plays after the care it shows has been saved.
 */

/** What the pet can be asked to do. The pet knows each of these. */
export const PET_CUES = ["look", "happy", "no", "hop", "dance", "eat", "nibble", "lean", "sleep", "fetch", "idle"] as const;
export type PetCue = (typeof PET_CUES)[number];

/**
 * Where the pet stands for the moment, relative to the player:
 * `free` stays put and turns to look, `front` is within reach of a kneeling
 * player, `beside` is shoulder to shoulder facing the room, `bed` is its
 * cushion.
 */
export const FORMATIONS = ["free", "front", "beside", "bed"] as const;
type Formation = (typeof FORMATIONS)[number];

export const PROPS = ["bowl", "treat", "brush", "ball"] as const;
export type PropKind = (typeof PROPS)[number];

export interface Moment {
  id: string;
  /** The button, in the imperative. */
  label: string;
  /** A glyph from the design system's icon set, beside the label. */
  icon: string;
  /**
   * Clips in order; `at` is seconds into the moment. A `loop` clip repeats
   * until the moment ends; otherwise the player idles once the clips are done.
   */
  clips: Array<{ at: number; name: string; src?: string; loop?: boolean }>;
  /** Seconds the moment lasts. Defaults to the end of the last clip. */
  length?: number;
  formation: Formation;
  /** Which way the player turns for it, in degrees from facing the room. */
  facing?: number;
  /** In front of the player, the pet faces them, or the room (so its face shows). */
  petFaces?: "player" | "room";
  /** Where the player looks: at the pet (the default) or out to the room. */
  lookAt?: "pet" | "room";
  pet: Array<{ at: number; cue: PetCue }>;
  /** A prop in the player's hand. `release` sets it down or throws it. */
  prop?: { kind: PropKind; hand: "right" | "both"; from: number; release?: number; to: number };
  /** Seconds the right hand is on the pet: its crown (a pat) or at its mouth (a treat). */
  contact?: { from: number; to: number; at?: "crown" | "mouth" };
  /** With reduced motion the room shows this second, still, instead. */
  still: number;
  /** What the room announces to a screen reader; nothing shows it. `{pet}` is the pet's name. */
  says: string;
}

export const MOMENTS: readonly Moment[] = [
  {
    id: "wave",
    label: "Wave",
    icon: "paw",
    clips: [{ at: 0, name: "Wave" }],
    formation: "free",
    pet: [
      { at: 0.2, cue: "look" },
      { at: 0.9, cue: "hop" },
      { at: 1.6, cue: "happy" },
    ],
    still: 1.0,
    says: "You wave. {pet} saw.",
  },
  {
    id: "dance",
    label: "Dance",
    icon: "music",
    clips: [{ at: 0, name: "Dance", loop: true }],
    length: 8,
    lookAt: "room",
    formation: "beside",
    facing: 12,
    pet: [{ at: 0, cue: "dance" }],
    still: 1.25,
    says: "You and {pet} dance.",
  },
  {
    id: "pet",
    label: "Pet",
    icon: "heart",
    clips: [{ at: 0, name: "Pet" }],
    formation: "front",
    facing: 62,
    petFaces: "room",
    pet: [
      { at: 1.45, cue: "lean" },
      { at: 4.3, cue: "happy" },
    ],
    contact: { from: 1.45, to: 4.2 },
    still: 2.2,
    says: "You pet {pet}.",
  },
  {
    id: "treat",
    label: "Treat",
    icon: "star",
    clips: [{ at: 0, name: "Treat" }],
    formation: "front",
    facing: 66,
    petFaces: "player",
    pet: [
      { at: 1.5, cue: "nibble" },
      { at: 3.1, cue: "happy" },
    ],
    contact: { from: 1.75, to: 2.65, at: "mouth" },
    prop: { kind: "treat", hand: "right", from: 0.8, to: 2.6 },
    still: 1.9,
    says: "{pet} takes the treat from your hand.",
  },
  {
    // Its clip arrives in its own file: an emote added as an asset and this entry.
    id: "cheer",
    label: "Cheer",
    icon: "spark",
    clips: [{ at: 0, name: "Cheer", src: "/3d/emotes/cheer.glb" }],
    lookAt: "room",
    formation: "free",
    pet: [
      { at: 0.2, cue: "look" },
      { at: 0.5, cue: "hop" },
      { at: 1.1, cue: "hop" },
      { at: 1.6, cue: "happy" },
    ],
    still: 0.9,
    says: "You cheer. {pet} bounces.",
  },
  {
    id: "feed",
    label: "Feed",
    icon: "bowl",
    clips: [{ at: 0, name: "Feed" }],
    formation: "front",
    facing: 86,
    petFaces: "player",
    pet: [
      { at: 2.1, cue: "eat" },
      { at: 5.3, cue: "happy" },
    ],
    prop: { kind: "bowl", hand: "both", from: 0.25, release: 1.9, to: 6.0 },
    still: 2.6,
    says: "You set the bowl down. {pet} eats.",
  },
  {
    id: "brush",
    label: "Brush",
    icon: "heart",
    clips: [{ at: 0, name: "Pet" }],
    formation: "front",
    facing: 62,
    petFaces: "room",
    pet: [
      { at: 1.45, cue: "lean" },
      { at: 4.3, cue: "happy" },
    ],
    prop: { kind: "brush", hand: "right", from: 1.0, to: 4.6 },
    contact: { from: 1.45, to: 4.2 },
    still: 2.2,
    says: "You brush {pet}.",
  },
  {
    id: "fetch",
    label: "Play fetch",
    icon: "ball",
    clips: [
      { at: 0, name: "Throw" },
      { at: 4.6, name: "Clap" },
    ],
    formation: "beside",
    facing: 85,
    pet: [
      { at: 0, cue: "look" },
      { at: 0.8, cue: "fetch" },
      { at: 4.6, cue: "happy" },
    ],
    prop: { kind: "ball", hand: "right", from: 0, release: 0.78, to: 6.0 },
    still: 0.6,
    says: "You throw the ball. {pet} brings it back.",
  },
  {
    id: "rest",
    label: "Rest",
    icon: "clock",
    clips: [{ at: 0, name: "Hush" }],
    lookAt: "room",
    formation: "free",
    facing: 12,
    pet: [
      { at: 0, cue: "look" },
      { at: 0.6, cue: "sleep" },
    ],
    length: 4,
    still: 1.2,
    says: "{pet} curls up on the cushion.",
  },
];

/** The emote row: moments a player can start at any time. */
export const EMOTES = ["wave", "dance", "pet", "treat", "cheer"] as const;

/**
 * Poses for a photo: a moment's own clip, staged for the camera instead of
 * for each other — both of you turned to it, the pet at your side or in
 * your arms — and held at one second while the photo is taken. The pet
 * holds a frame of its own clip, mid-hop if it is cheering. Expression
 * only, like every moment: nothing saved changes.
 */
export interface PhotoPoseSpec {
  value: string;
  label: string;
  icon: string;
  /** The moment whose clip it borrows. */
  moment: string;
  /** Staging that replaces the moment's own, so faces show to the camera. */
  stage?: Pick<Moment, "formation" | "facing" | "lookAt">;
  /** The second of the moment the player holds. */
  still: number;
  pet: { clip: "idle" | "gesture-positive" | "dance"; at: number; hop?: boolean };
}

const TO_CAMERA = { formation: "beside", facing: 8, lookAt: "room" } as const;

export const PHOTO_POSES = [
  { value: "wave", label: "Wave", icon: "paw", moment: "wave", stage: TO_CAMERA, still: 1.0, pet: { clip: "gesture-positive", at: 0.9 } },
  { value: "cheer", label: "Cheer", icon: "spark", moment: "cheer", stage: TO_CAMERA, still: 0.9, pet: { clip: "gesture-positive", at: 0.3, hop: true } },
  { value: "cuddle", label: "Cuddle", icon: "heart", moment: "pet", still: 2.2, pet: { clip: "idle", at: 0.6 } },
  { value: "dance", label: "Dance", icon: "music", moment: "dance", stage: { ...TO_CAMERA, facing: 14 }, still: 0.3, pet: { clip: "dance", at: 1.2, hop: true } },
] as const satisfies readonly PhotoPoseSpec[];
export type PhotoPose = (typeof PHOTO_POSES)[number]["value"];

export function findPhotoPose(id: string): PhotoPoseSpec | undefined {
  return PHOTO_POSES.find((pose) => pose.value === id);
}

/** The moment each care action shows, once that care has been saved. */
export const CARE_MOMENT: Record<CareActionType, string> = {
  [CareActionType.Feed]: "feed",
  [CareActionType.Play]: "fetch",
  [CareActionType.Groom]: "brush",
  [CareActionType.Rest]: "rest",
};

export function findMoment(id: string): Moment | undefined {
  return MOMENTS.find((moment) => moment.id === id);
}

/** Seconds a moment lasts, given the durations of its clips. */
export function momentLength(moment: Moment, clipDuration: (name: string) => number): number {
  if (moment.length !== undefined) return moment.length;
  return Math.max(...moment.clips.map((clip) => clip.at + clipDuration(clip.name)));
}

export function momentSentence(moment: Moment, petName: string): string {
  return moment.says.replaceAll("{pet}", petName);
}

/**
 * A room cue: which moment, and a nonce so the same moment can be asked
 * for twice in a row.
 */
export interface RoomCue {
  moment: string;
  nonce: number;
}
